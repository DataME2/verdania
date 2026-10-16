"""Build dist/verdania-sim-lambda.zip for AWS Lambda (python3.12, arm64). No Docker needed:
NumPy comes from its pre-built manylinux wheel.

    uv run python deploy/build_lambda.py
"""

import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build" / "lambda"
OUT = ROOT / "dist" / "verdania-sim-lambda.zip"
SKIP_DIRS = {"__pycache__", "tests", "testing"}  # NumPy's own test suites are not needed at runtime
SKIP_MODULES = {"api.py", "seed.py"}  # FastAPI server and DB seed generator stay out of the bundle

shutil.rmtree(BUILD, ignore_errors=True)
BUILD.mkdir(parents=True)
subprocess.run(
    ["uv", "pip", "install", "--quiet", "--target", str(BUILD), "--python-platform", "aarch64-manylinux2014",
     "--python-version", "3.12", "--only-binary", ":all:", "numpy>=1.26"],
    check=True,
)
shutil.copytree(ROOT / "verdania_sim", BUILD / "verdania_sim",
                ignore=shutil.ignore_patterns("__pycache__", *SKIP_MODULES))

OUT.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for path in sorted(BUILD.rglob("*")):
        rel = path.relative_to(BUILD)
        if path.is_file() and not SKIP_DIRS & set(rel.parts):
            zf.write(path, rel.as_posix())
print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
