import os
import math
import sys

def install_and_import(package):
    import importlib
    try:
        importlib.import_module(package)
    except ImportError:
        import subprocess
        print(f"[*] Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])

# Make sure Pillow is installed
install_and_import("Pillow")

from PIL import Image, ImageDraw, ImageFilter

def create_gradient_background(size):
    # Create a diagonal linear gradient
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = img.load()
    
    # Colors: Deep Indigo/Slate (#111827 / #1e1b4b) to Electric Purple (#4f46e5) and Cyan (#06b6d4)
    # Let's define the corner colors
    # Top-Left: #0f172a (dark blue-slate)
    # Bottom-Right: #4f46e5 (vibrant indigo)
    c1 = (15, 23, 42)
    c2 = (79, 70, 229)
    
    for y in range(size):
        for x in range(size):
            # Calculate diagonal distance ratio (0.0 to 1.0)
            ratio = (x + y) / (2.0 * size)
            # Interpolate RGB
            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)
            pixels[x, y] = (r, g, b, 255)
            
    return img

def draw_squircle_mask(size, radius):
    # Returns a squircle transparency mask
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask

def generate_icon():
    print("[*] Generating premium app icon...")
    size = 512
    icon = create_gradient_background(size)
    
    # Draw central glowing elements
    # We will use an overlay canvas with transparency to draw glowing/semi-transparent layers
    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    cx, cy = size // 2, size // 2 - 20
    
    # 1. Draw glowing accent background (ambient light)
    # Draw a soft cyan/purple glow in the center
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((cx - 150, cy - 150, cx + 150, cy + 150), fill=(6, 182, 212, 40)) # Cyan glow
    glow_draw.ellipse((cx - 100, cy - 100, cx + 100, cy + 100), fill=(139, 92, 246, 60)) # Violet glow
    glow = glow.filter(ImageFilter.GaussianBlur(35))
    icon.alpha_composite(glow)
    
    # 2. Draw beautiful outer design ring
    draw.arc((cx - 160, cy - 160, cx + 160, cy + 160), start=0, end=360, fill=(255, 255, 255, 20), width=4)
    draw.arc((cx - 160, cy - 160, cx + 160, cy + 160), start=-45, end=135, fill=(6, 182, 212, 180), width=4) # Neon cyan highlight
    draw.arc((cx - 160, cy - 160, cx + 160, cy + 160), start=135, end=315, fill=(139, 92, 246, 180), width=4) # Neon violet highlight
    
    # 3. Draw stylized Open Book (representing study/knowledge)
    # Left page curve, right page curve
    book_color = (255, 255, 255, 240)
    book_y = cy + 60
    
    # Left Page
    draw.arc((cx - 100, book_y - 20, cx, book_y + 40), start=180, end=360, fill=book_color, width=6)
    # Right Page
    draw.arc((cx, book_y - 20, cx + 100, book_y + 40), start=180, end=360, fill=book_color, width=6)
    
    # Spine/Center line
    draw.line((cx, book_y + 10, cx, book_y + 50), fill=book_color, width=6)
    # Bottom margins of pages
    draw.line((cx - 100, book_y + 10, cx - 100, book_y + 35), fill=book_color, width=6)
    draw.line((cx + 100, book_y + 10, cx + 100, book_y + 35), fill=book_color, width=6)
    draw.line((cx - 100, book_y + 35, cx, book_y + 50), fill=book_color, width=6)
    draw.line((cx + 100, book_y + 35, cx, book_y + 50), fill=book_color, width=6)
    
    # 4. Draw Rising Neural Network / Brain constellation (representing local intelligence)
    # Define node coordinates (representing key points of a brain)
    nodes = [
        (cx, cy - 110),       # Top
        (cx - 50, cy - 80),   # Upper Left
        (cx + 50, cy - 80),   # Upper Right
        (cx - 75, cy - 30),   # Middle Left
        (cx + 75, cy - 30),   # Middle Right
        (cx - 45, cy + 20),   # Lower Left
        (cx + 45, cy + 20),   # Lower Right
        (cx, cy - 40),        # Center
    ]
    
    # Define connection lines
    connections = [
        (0, 1), (0, 2), (1, 3), (2, 4), (3, 5), (4, 6),
        (1, 7), (2, 7), (3, 7), (4, 7), (5, 7), (6, 7),
        (5, 6)
    ]
    
    # Draw connections with neon gradient colors
    for start_idx, end_idx in connections:
        p1, p2 = nodes[start_idx], nodes[end_idx]
        draw.line((p1, p2), fill=(165, 180, 252, 100), width=3) # Semi-transparent indigo
        
    # Draw glowing connection paths to the book (symbolizing information flowing into AI)
    draw.line((nodes[5], (cx - 50, book_y + 10)), fill=(6, 182, 212, 120), width=3)
    draw.line((nodes[6], (cx + 50, book_y + 10)), fill=(139, 92, 246, 120), width=3)
    draw.line((nodes[7], (cx, book_y + 10)), fill=(255, 255, 255, 120), width=3)
    
    # Draw glowing circular nodes
    for i, (nx, ny) in enumerate(nodes):
        # Determine node color
        if i == 0:
            color = (255, 255, 255, 255) # White central spark
            radius = 10
        elif i in [1, 3, 5]:
            color = (6, 182, 212, 255)   # Neon Cyan
            radius = 8
        elif i in [2, 4, 6]:
            color = (139, 92, 246, 255)  # Neon Purple
            radius = 8
        else:
            color = (255, 255, 255, 240) # Bright inner node
            radius = 9
            
        # Draw node glow
        draw.ellipse((nx - radius - 4, ny - radius - 4, nx + radius + 4, ny + radius + 4), fill=(color[0], color[1], color[2], 50))
        # Draw solid node
        draw.ellipse((nx - radius, ny - radius, nx + radius, ny + radius), fill=color)
        
    icon.alpha_composite(overlay)
    
    # 5. Apply squircle rounded-corner look (standard macOS/Windows modern app icon format)
    # We will save one square version, and one rounded squircle version
    os.makedirs("build", exist_ok=True)
    os.makedirs("public", exist_ok=True)
    
    # Save standard full-size square icon
    icon.save("build/icon.png", "PNG")
    icon.save("public/icon.png", "PNG")
    print("[+] Square PNG saved successfully under build/icon.png and public/icon.png!")
    
    # Save a rounded squircle version just in case
    rounded = icon.copy()
    mask = draw_squircle_mask(size, 115) # Standard squircle radius for 512px
    rounded.putalpha(mask)
    rounded.save("build/icon-rounded.png", "PNG")
    print("[+] Rounded Squircle PNG saved successfully under build/icon-rounded.png!")
    
    # Convert and save as .ico file for Windows build compatibility!
    try:
        ico_img = Image.open("build/icon.png")
        # ICO formats can pack multiple sizes: 16x16, 32x32, 48x48, 256x256
        sizes = [(16, 16), (32, 32), (48, 48), (256, 256)]
        ico_img.save("build/icon.ico", format="ICO", sizes=sizes)
        print("[+] Windows ICO saved successfully under build/icon.ico!")
    except Exception as ico_err:
        print(f"[-] Failed to generate ICO: {ico_err}")
        
    # Convert and save as .icns file for macOS build compatibility if possible
    try:
        icns_img = Image.open("build/icon.png")
        icns_img.save("build/icon.icns", format="ICNS")
        print("[+] macOS ICNS saved successfully under build/icon.icns!")
    except Exception as icns_err:
        # Note: sometimes Pillow needs additional libraries or doesn't support ICNS on all platforms
        print(f"[*] macOS ICNS build skipped or not fully supported by local Pillow: {icns_err}")

if __name__ == "__main__":
    generate_icon()
