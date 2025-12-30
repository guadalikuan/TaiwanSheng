import pygame
import random
import math

# 初始化
pygame.init()

# 屏幕设置
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("古风意境 · 孤月流灯 (心愿版)")

# 颜色定义
SKY_TOP = (5, 5, 20)
SKY_BOTTOM = (15, 10, 35)
STAR_WHITE = (255, 255, 240)

# --- 新增：心愿词库 ---
WISHES = ["平安", "喜乐", "顺遂", "安康", "锦绣", "如愿", "团圆", "祈福", "良辰", "美景"]

# 加载字体
try:
    font = pygame.font.SysFont("SimHei", 24)
except:
    font = pygame.font.SysFont("arial", 24)


def clamp(n):
    return max(0, min(255, int(n)))


def lerp_color(c1, c2, t):
    return (
        clamp(c1[0] + (c2[0] - c1[0]) * t),
        clamp(c1[1] + (c2[1] - c1[1]) * t),
        clamp(c1[2] + (c2[2] - c1[2]) * t)
    )


# --- 优化的环境绘制 ---
def create_moon_surface():
    """创建一个带有柔和月晕和纹理的月亮"""
    size = 200
    surf = pygame.Surface((size, size), pygame.SRCALPHA)
    cx, cy = size // 2, size // 2

    # 1. 最外层超大弥散光晕
    for r in range(80, 40, -2):
        alpha = int(30 * (1 - r / 80) ** 2)
        pygame.draw.circle(surf, (255, 255, 200, alpha), (cx, cy), r)

    # 2. 核心月晕
    for r in range(45, 30, -1):
        alpha = int(100 * (1 - r / 45))
        pygame.draw.circle(surf, (255, 255, 230, alpha), (cx, cy), r)

    # 3. 月亮本体
    pygame.draw.circle(surf, (255, 255, 245), (cx, cy), 30)

    # 4. 淡淡的月影纹理 (模拟环形山)
    for _ in range(5):
        tx = cx + random.randint(-15, 15)
        ty = cy + random.randint(-15, 15)
        tr = random.randint(3, 8)
        pygame.draw.circle(surf, (240, 240, 220), (tx, ty), tr)

    return surf


MOON_SURF = create_moon_surface()
BG_SURF = pygame.Surface((WIDTH, HEIGHT))
for y in range(HEIGHT):
    c = lerp_color(SKY_TOP, SKY_BOTTOM, y / HEIGHT)
    pygame.draw.line(BG_SURF, c, (0, y), (WIDTH, y))


# --- 粒子与孔明灯类 ---
class FireSpark:
    def __init__(self, x, y, scale):
        self.x = x
        self.y = y
        self.vx = random.uniform(-0.4, 0.4)
        self.vy = random.uniform(-1.2, -0.4) * scale
        self.life = 1.0
        self.decay = random.uniform(0.015, 0.025)
        self.size = random.uniform(1, 2.5) * scale

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.vy += 0.015  # 轻微重力
        self.life -= self.decay
        return self.life > 0

    def draw(self, surface):
        alpha = clamp(self.life * 255)
        c = lerp_color((255, 200, 50), (150, 30, 0), 1 - self.life)
        s = pygame.Surface((int(self.size * 2), int(self.size * 2)), pygame.SRCALPHA)
        pygame.draw.circle(s, (*c, alpha), (int(self.size), int(self.size)), int(self.size))
        surface.blit(s, (self.x, self.y))


class Lantern:
    def __init__(self):
        self.z = random.uniform(1.2, 4.5)
        self.x = random.randint(50, WIDTH - 50)
        self.y = HEIGHT + 100
        self.speed_y = random.uniform(0.6, 1.2) / self.z
        self.time_offset = random.uniform(0, 100)
        self.sparks = []
        self.alive = True
        # --- 优化3点1：随机分配心愿文字 ---
        self.wish = random.choice(WISHES)

    def update(self):
        self.y -= self.speed_y
        self.time_offset += 0.02
        self.tilt = math.sin(self.time_offset) * 4
        self.x += math.cos(self.time_offset * 0.5) * (0.3 / self.z)

        if random.random() > 0.75:
            scale = 1.0 / self.z
            self.sparks.append(FireSpark(self.x, self.y + 50 * scale, scale))
        self.sparks = [p for p in self.sparks if p.update()]
        if self.y < -150: self.alive = False

    def draw(self, surface):
        scale = 1.0 / self.z
        w, h = 40 * scale, 60 * scale

        # 1. 强化版动态光晕 (Bloom)
        breath = (math.sin(self.time_offset * 3) + 1) * 0.1
        glow_r = int(w * (2.5 + breath))
        glow_s = pygame.Surface((glow_r * 2, glow_r * 2), pygame.SRCALPHA)
        for i in range(glow_r, 0, -4):
            alpha_glow = int(45 * (1 - i / glow_r) ** 2)
            pygame.draw.circle(glow_s, (255, 120, 40, alpha_glow), (glow_r, glow_r), i)
        surface.blit(glow_s, (int(self.x - glow_r), int(self.y - glow_r + h / 2)),
                     special_flags=pygame.BLEND_ALPHA_SDL2)

        # 2. 绘制粒子
        for p in self.sparks: p.draw(surface)

        # 3. 绘制灯笼主体
        l_surf = pygame.Surface((int(w * 3), int(h * 4)), pygame.SRCALPHA)
        cx, cy = w * 1.5, h * 1.5

        c_breath = (math.sin(self.time_offset * 2) + 1) * 10
        m_r, m_g = clamp(230 + c_breath), clamp(80 + c_breath / 2)

        for i in range(int(h)):
            ratio = i / h
            cur_w = w * (0.8 + 0.2 * math.sin(math.pi * ratio))
            r = clamp(m_r * ratio + 150 * (1 - ratio))
            g = clamp(m_g * ratio + 40 * (1 - ratio))
            alpha = clamp(180 + 40 * (1 - ratio))

            line_y = int(cy - h * 0.5 + i)
            pygame.draw.line(l_surf, (r, g, 30, alpha), (int(cx - cur_w / 2), line_y), (int(cx + cur_w / 2), line_y))

            if i % 3 == 0:
                for edge in [-0.45, 0.45]:
                    pos_x = int(cx + cur_w * edge)
                    l_surf.set_at((pos_x, line_y), (100, 30, 10, int(alpha // 2)))

        # --- 优化3点2：在灯笼主体上绘制文字 (Ink on paper) ---
        wish_size = int(18 * scale)
        if wish_size > 5:  # 只有足够大的时候才画字
            try:
                # 动态生成适合当前比例的字体大小
                wish_font = pygame.font.SysFont("SimHei", wish_font_size := wish_size)
            except:
                wish_font = pygame.font.SysFont("arial", wish_size)

            # 使用暗墨色 (Dark brown/red) 模拟墨水，并设置半透明增加融合感
            wish_surf = wish_font.render(self.wish, True, (80, 20, 10))
            wish_surf.set_alpha(160)  # 墨水渗入纸张的效果
            wish_rect = wish_surf.get_rect(center=(cx, cy))
            l_surf.blit(wish_surf, wish_rect)

        # 4. 底部穗子 (Tassels)
        tassel_len = h * 0.6
        for offset_x in [-w * 0.2, w * 0.2]:
            t_start = (cx + offset_x, cy + h * 0.5)
            t_end_x = t_start[0] - math.sin(self.time_offset * 1.5) * (5 * scale)
            t_end_y = t_start[1] + tassel_len
            pygame.draw.line(l_surf, (150, 40, 20, 200), t_start, (int(t_end_x), int(t_end_y)),
                             max(1, int(1.5 * scale)))
            pygame.draw.circle(l_surf, (200, 160, 40, 220), (int(t_end_x), int(t_end_y)), max(1, int(2 * scale)))

        # 5. 火源核心
        pygame.draw.ellipse(l_surf, (255, 255, 200, 240),
                            (int(cx - w * 0.15), int(cy + h * 0.25), int(w * 0.3), int(h * 0.15)))

        # 6. 旋转并渲染 (文字会随之一起旋转)
        rotated = pygame.transform.rotate(l_surf, self.tilt)
        surface.blit(rotated, rotated.get_rect(center=(int(self.x), int(self.y + h * 0.2))))


def main():
    clock = pygame.time.Clock()
    lanterns = []
    stars = [(random.randint(0, WIDTH), random.randint(0, HEIGHT), random.uniform(0.4, 1.2)) for _ in range(120)]
    btn_rect = pygame.Rect(WIDTH // 2 - 80, HEIGHT - 70, 160, 45)

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT: running = False
            if event.type == pygame.MOUSEBUTTONDOWN and btn_rect.collidepoint(event.pos):
                for _ in range(random.randint(4, 6)): lanterns.append(Lantern())

        # 更新
        for l in lanterns: l.update()
        lanterns = [l for l in lanterns if l.alive]
        lanterns.sort(key=lambda l: l.z, reverse=True)

        # 绘制
        screen.blit(BG_SURF, (0, 0))

        # 绘制星星
        for x, y, s in stars:
            a = int(150 + 105 * math.sin(pygame.time.get_ticks() * 0.001 + x))
            pygame.draw.circle(screen, (255, 255, 240, a), (x, y), int(s))

        # 绘制月亮
        screen.blit(MOON_SURF, (WIDTH - 180, 30), special_flags=pygame.BLEND_ADD)

        # 绘制孔明灯
        for l in lanterns: l.draw(screen)

        # 按钮 UI
        m_pos = pygame.mouse.get_pos()
        hover = btn_rect.collidepoint(m_pos)
        pygame.draw.rect(screen, (80, 40, 100) if hover else (50, 30, 80), btn_rect, border_radius=22)
        txt = font.render("放飞心愿", True, (255, 230, 150))
        screen.blit(txt, txt.get_rect(center=btn_rect.center))

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()


if __name__ == "__main__":
    main()