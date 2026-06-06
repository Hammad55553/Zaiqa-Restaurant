import os
import sys
from PIL import Image

logo_path = "/Users/mac/React-native/Zaiqah/web/public/Logo.jpg"
build_dir = "/Users/mac/React-native/Zaiqah/desktop/build"

if not os.path.exists(build_dir):
    os.makedirs(build_dir)

if not os.path.exists(logo_path):
    print(f"Error: Logo not found at {logo_path}")
    sys.exit(1)

try:
    img = Image.open(logo_path)
    
    # Save as PNG
    png_path = os.path.join(build_dir, "icon.png")
    img.save(png_path, format="PNG")
    print(f"Generated: {png_path}")
    
    # Save as ICO
    ico_path = os.path.join(build_dir, "icon.ico")
    img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(f"Generated: {ico_path}")
    
    # Save as ICNS
    icns_path = os.path.join(build_dir, "icon.icns")
    # For macOS, we can save it as ICNS directly if PIL supports it
    img.save(icns_path, format="ICNS")
    print(f"Generated: {icns_path}")
    
    print("✨ Icon generation completed successfully!")
except Exception as e:
    print(f"Failed to generate icons: {e}")
    sys.exit(1)
