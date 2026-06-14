import re

def hex_to_css_var(hex_color):
    """将十六进制颜色转换为CSS变量名称"""
    color_map = {
        '#000000': 'var(--bg-primary)',
        '#1a1a1a': 'var(--bg-secondary)',
        '#333333': 'var(--border-color)',
        '#ffffff': 'var(--text-primary)',
        '#888888': 'var(--text-secondary)',
        '#555555': 'var(--text-muted)',
        '#f5f5f5': 'var(--bg-secondary)',
        '#e0e0e0': 'var(--border-color)',
        '#666666': 'var(--text-secondary)',
        '#999999': 'var(--text-muted)',
        '#000': 'var(--text-primary)',
        '#fff': 'var(--text-primary)',
    }
    return color_map.get(hex_color.lower(), None)

def replace_colors_in_file(file_path):
    """替换文件中的颜色为CSS变量"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 替换十六进制颜色
    patterns = [
        (r'#000000', 'var(--bg-primary)'),
        (r'#1a1a1a', 'var(--bg-secondary)'),
        (r'#333333', 'var(--border-color)'),
        (r'#ffffff', 'var(--text-primary)'),
        (r'#888888', 'var(--text-secondary)'),
        (r'#555555', 'var(--text-muted)'),
        (r'#f5f5f5', 'var(--bg-secondary)'),
        (r'#e0e0e0', 'var(--border-color)'),
        (r'#666666', 'var(--text-secondary)'),
        (r'#999999', 'var(--text-muted)'),
        (r'#000\b', 'var(--text-primary)'),
        (r'#fff\b', 'var(--text-primary)'),
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    
    # 替换特定颜色属性
    replacements = [
        ('color: var(--text-primary);', 'color: var(--text-primary);'),
        ('background: var(--bg-primary);', 'background: var(--bg-primary);'),
    ]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"已完成颜色替换: {file_path}")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        replace_colors_in_file(sys.argv[1])
    else:
        print("用法: python color_replacer.py <文件路径>")
