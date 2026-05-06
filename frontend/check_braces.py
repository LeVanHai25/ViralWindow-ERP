
with open('d:/ViralWindow_Phan_Mem_Nhom_Kinh/FontEnd/inventory.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_script = False
stack = []
for i, line in enumerate(lines):
    line_num = i + 1
    if '<script>' in line:
        in_script = True
        continue
    if '</script>' in line:
        in_script = False
        if stack:
            print(f"Error: Script ending at line {line_num} has unclosed blocks:")
            for s in stack:
                print(f"  Unclosed '{s[0]}' opened at line {s[1]}")
        stack = []
        continue
    
    if in_script:
        for char in line:
            if char == '{':
                stack.append(('{', line_num))
            elif char == '}':
                if stack:
                    stack.pop()
                else:
                    print(f"Error: Excess '}}' at line {line_num}")
