#!/usr/bin/env python3
"""LifeVerse Objaverse building optimization pipeline.

This script turns a downloaded Objaverse GLB into a public-build-safe Life Sim
building asset:

  downloaded GLB
    -> Blender import
    -> decimate mesh
    -> resize/compress textures where possible
    -> Draco compression via glTF Transform
    -> generate LOD0/LOD1/LOD2 GLBs
    -> register optimized building replacement in asset-manifest.json

It intentionally does not download models. Use tools/objaverse_fetch.py first,
then run this script on the downloaded local GLB. Raw Objaverse scans must not
be loaded directly by life-sim.js.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "assets" / "life-sim" / "asset-manifest.json"
OPTIMIZED_ROOT = REPO_ROOT / "assets" / "environment" / "objaverse-optimized"


def repo_rel(path: Path) -> str:
    return str(path.resolve().relative_to(REPO_ROOT)).replace(os.sep, "/")


def parse_csv_numbers(value: str, expected: int | None = None) -> list[float]:
    values = [float(part.strip()) for part in value.split(",") if part.strip()]
    if expected is not None and len(values) != expected:
        raise argparse.ArgumentTypeError(f"Expected {expected} comma-separated numbers, got {len(values)}.")
    return values


def parse_csv_strings(values: list[str] | None) -> list[str]:
    output: list[str] = []
    for value in values or []:
        output.extend(part.strip() for part in value.split(",") if part.strip())
    return output


def require_tool(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"Required tool not found on PATH: {name}")
    return path


def run_command(command: list[str], dry_run: bool = False) -> None:
    print(" ".join(f'"{part}"' if " " in part else part for part in command))
    if dry_run:
        return
    subprocess.run(command, check=True)


def blender_script(input_path: Path, output_path: Path, decimate_ratio: float, texture_size: int) -> str:
    return f"""
import bpy
from pathlib import Path

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

bpy.ops.import_scene.gltf(filepath={str(input_path)!r})

for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        if {decimate_ratio!r} < 0.999:
            modifier = obj.modifiers.new('LifeVerse_Decimate', 'DECIMATE')
            modifier.ratio = max(0.05, min(1.0, {decimate_ratio!r}))
            try:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            except Exception:
                pass
        obj.select_set(False)

for image in bpy.data.images:
    if image.size[0] > {texture_size} or image.size[1] > {texture_size}:
        scale = min({texture_size} / max(1, image.size[0]), {texture_size} / max(1, image.size[1]))
        width = max(1, int(image.size[0] * scale))
        height = max(1, int(image.size[1] * scale))
        try:
            image.scale(width, height)
        except Exception:
            pass

export_kwargs = dict(
    filepath={str(output_path)!r},
    export_format='GLB',
    export_apply=True,
    export_yup=True
)

try:
    export_kwargs['export_draco_mesh_compression_enable'] = True
    export_kwargs['export_draco_mesh_compression_level'] = 6
except Exception:
    pass

bpy.ops.export_scene.gltf(**export_kwargs)
"""


def run_blender(input_path: Path, output_path: Path, ratio: float, texture_size: int, dry_run: bool) -> None:
    blender = require_tool("blender")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as handle:
        handle.write(blender_script(input_path, output_path, ratio, texture_size))
        script_path = Path(handle.name)
    try:
        run_command([blender, "--background", "--python", str(script_path)], dry_run=dry_run)
    finally:
        if script_path.exists():
            script_path.unlink()


def run_gltf_transform(input_path: Path, output_path: Path, texture_size: int, dry_run: bool) -> None:
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        raise RuntimeError("npx is required for glTF Transform Draco/texture optimization.")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        npx,
        "--yes",
        "@gltf-transform/cli",
        "optimize",
        str(input_path),
        str(output_path),
        "--compress",
        "draco",
        "--texture-size",
        str(texture_size)
    ]
    run_command(command, dry_run=dry_run)


def load_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {}
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def upsert_building_asset(manifest: dict, entry: dict) -> None:
    manifest.setdefault("objaverseBuildingAssets", [])
    existing = manifest["objaverseBuildingAssets"]
    for index, current in enumerate(existing):
        if current.get("id") == entry["id"]:
            existing[index] = entry
            return
    existing.append(entry)


def ensure_building_pass(manifest: dict) -> None:
    passes = manifest.setdefault("objaverseBuildingReplacementPasses", [])
    if any(item.get("id") == "singapore-realistic-buildings-v1" for item in passes):
        return
    passes.append({
        "id": "singapore-realistic-buildings-v1",
        "status": "enabled",
        "purpose": "Load only optimized local Objaverse building GLBs.",
        "categories": ["hdb", "mixed_use", "mall", "mrt", "food_court", "office", "hospital", "university"]
    })


def build_manifest_entry(args: argparse.Namespace, lod_outputs: list[Path]) -> dict:
    hide_names = parse_csv_strings(args.hide_name)
    hide_prefixes = parse_csv_strings(args.hide_prefix)
    if not hide_names and not hide_prefixes:
        raise RuntimeError("At least one --hide-name or --hide-prefix is required so the optimized building replaces a known fallback.")

    distances = parse_csv_numbers(args.lod_distances)
    if len(distances) != len(lod_outputs):
        raise RuntimeError("--lod-distances must have the same number of entries as --lod-ratios.")

    entry = {
        "id": args.asset_id,
        "label": args.label or args.asset_id,
        "category": args.category,
        "url": repo_rel(lod_outputs[0]),
        "optimized": True,
        "pipeline": "objaverse-blender-decimate-texture-draco-lod",
        "sourceUrl": args.source_url or "",
        "license": args.license or "",
        "author": args.author or "",
        "targetHeightMeters": args.target_height,
        "position": parse_csv_numbers(args.position, expected=3),
        "rotation": parse_csv_numbers(args.rotation, expected=3),
        "scale": parse_csv_numbers(args.scale, expected=3),
        "hideNames": hide_names,
        "hideNamePrefixes": hide_prefixes,
        "lods": [
            {
                "url": repo_rel(path),
                "distance": distances[index],
                "ratio": parse_csv_numbers(args.lod_ratios)[index]
            }
            for index, path in enumerate(lod_outputs)
        ],
        "budgets": {
            "maxTextureSize": args.texture_size,
            "maxPublicFileMb": args.max_public_mb
        }
    }
    return entry


def optimize(args: argparse.Namespace) -> list[Path]:
    input_path = Path(args.input).resolve()
    if not input_path.exists():
        raise RuntimeError(f"Input GLB not found: {input_path}")

    ratios = parse_csv_numbers(args.lod_ratios)
    if not ratios:
        raise RuntimeError("--lod-ratios must include at least one value.")

    asset_dir = OPTIMIZED_ROOT / args.asset_id
    asset_dir.mkdir(parents=True, exist_ok=True)
    final_outputs: list[Path] = []

    for index, ratio in enumerate(ratios):
        blender_output = asset_dir / f"{args.asset_id}_lod{index}_blender.glb"
        final_output = asset_dir / f"{args.asset_id}_lod{index}.glb"
        run_blender(input_path, blender_output, ratio, args.texture_size, args.dry_run)
        run_gltf_transform(blender_output, final_output, args.texture_size, args.dry_run)
        if not args.dry_run and blender_output.exists():
            blender_output.unlink()
        final_outputs.append(final_output)

    return final_outputs


def register_existing(args: argparse.Namespace) -> list[Path]:
    if not args.confirm_optimized:
        raise RuntimeError("--register-existing requires --confirm-optimized so raw Objaverse files are not registered by accident.")
    outputs = [Path(part.strip()).resolve() for part in args.input.split(",") if part.strip()]
    if not outputs:
        raise RuntimeError("--input must point to one or more optimized GLB files.")
    for path in outputs:
        if not path.exists():
            raise RuntimeError(f"Optimized GLB not found: {path}")
        try:
            path.relative_to(OPTIMIZED_ROOT)
        except ValueError as error:
            raise RuntimeError(f"Optimized building must live under {OPTIMIZED_ROOT}: {path}") from error
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", required=True, help="Downloaded source GLB, or comma-separated optimized LOD GLBs with --register-existing.")
    parser.add_argument("--asset-id", required=True, help="Stable manifest id, e.g. hdb-tampines-block-a.")
    parser.add_argument("--label", default="", help="Human-readable asset label.")
    parser.add_argument("--category", default="building", help="hdb, mixed_use, mall, mrt, food_court, office, hospital, university, etc.")
    parser.add_argument("--target-height", type=float, required=True, help="Real-world height in meters for scale normalization.")
    parser.add_argument("--position", default="0,0,0", help="Runtime position x,y,z.")
    parser.add_argument("--rotation", default="0,0,0", help="Runtime rotation x,y,z in radians.")
    parser.add_argument("--scale", default="1,1,1", help="Runtime base scale x,y,z before height normalization.")
    parser.add_argument("--hide-prefix", action="append", help="Fallback object name prefix to hide after this optimized building loads.")
    parser.add_argument("--hide-name", action="append", help="Fallback object name to hide after this optimized building loads.")
    parser.add_argument("--source-url", default="", help="Objaverse/Sketchfab source URL for attribution.")
    parser.add_argument("--license", default="", help="Asset license code.")
    parser.add_argument("--author", default="", help="Creator name for attribution.")
    parser.add_argument("--texture-size", type=int, default=1024, help="Max texture dimension for public GLB output.")
    parser.add_argument("--lod-ratios", default="1,0.55,0.25", help="LOD decimate ratios, e.g. 1,0.55,0.25.")
    parser.add_argument("--lod-distances", default="0,42,84", help="LOD switch distances for metadata.")
    parser.add_argument("--max-public-mb", type=float, default=8.0, help="Target max MB per public building GLB.")
    parser.add_argument("--execute", action="store_true", help="Actually run Blender/glTF Transform. Without this, print the plan only.")
    parser.add_argument("--register-existing", action="store_true", help="Register already optimized GLBs instead of running Blender.")
    parser.add_argument("--confirm-optimized", action="store_true", help="Required with --register-existing.")
    args = parser.parse_args()

    if not args.execute and not args.register_existing:
        print("Dry plan only. Add --execute to run Blender and glTF Transform.")
        print(f"Input: {args.input}")
        print(f"Output folder: {OPTIMIZED_ROOT / args.asset_id}")
        print(f"LOD ratios: {args.lod_ratios}")
        print(f"Texture size: {args.texture_size}")
        print("Required stages: Blender decimate -> texture resize -> Draco -> LOD GLBs -> manifest registration")
        return

    try:
        lod_outputs = register_existing(args) if args.register_existing else optimize(args)
        manifest = load_manifest()
        ensure_building_pass(manifest)
        entry = build_manifest_entry(args, lod_outputs)
        upsert_building_asset(manifest, entry)
        save_manifest(manifest)
        print(f"Registered optimized building asset: {entry['id']}")
        print(f"Manifest: {repo_rel(MANIFEST_PATH)}")
        print(f"Runtime URL: {entry['url']}")
    except Exception as error:
        print(f"LifeVerse asset pipeline failed: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
