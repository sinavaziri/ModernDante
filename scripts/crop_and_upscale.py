import os
from PIL import Image

def process_image(file_path):
    try:
        img = Image.open(file_path)
        
        # Convert to RGB if not already
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        # Create a mask for cropping
        # Convert to grayscale
        gray = img.convert('L')
        
        # Threshold to find content (pixels lighter than dark gray)
        # Assuming background is black/dark. We treat pixels > 25 as content.
        # This helps ignore compression artifacts in the black areas.
        threshold = 25
        mask = gray.point(lambda p: 255 if p > threshold else 0)
        
        # Get bounding box of the non-black content
        bbox = mask.getbbox()
        
        if bbox:
            cropped_img = img.crop(bbox)
        else:
            print(f"Warning: No content found in {file_path}, skipping crop.")
            cropped_img = img

        # Upscale by 2x
        new_size = (cropped_img.width * 2, cropped_img.height * 2)
        upscaled_img = cropped_img.resize(new_size, resample=Image.Resampling.LANCZOS)
        
        # Save as new file
        directory, filename = os.path.split(file_path)
        name, ext = os.path.splitext(filename)
        new_filename = f"{name}_processed{ext}"
        new_path = os.path.join(directory, new_filename)
        
        upscaled_img.save(new_path)
        print(f"Processed: {filename} -> {new_filename}")
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    target_dir = 'public/images/inferno/cropped'
    files = [f for f in os.listdir(target_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    # Filter out already processed files if any exist to avoid re-processing outputs
    files = [f for f in files if '_processed' not in f]
    
    files.sort()
    
    # Process up to 5 files (though there are only 5 there)
    for f in files[:5]:
        process_image(os.path.join(target_dir, f))

if __name__ == "__main__":
    main()



