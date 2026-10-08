import re

def replace_images():
    path = r'c:\sura\allin\index.html'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    content = re.sub(r'<img class="logo" src="[^"]+"', '<img class="logo" src="logo-removebg.png"', content)
    content = re.sub(r'<img class="car" src="[^"]+"', '<img class="car" src="car_clean.png"', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    replace_images()
