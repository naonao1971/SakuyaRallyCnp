from PIL import Image, ImageDraw
import sys

# 咲耶Nounラリーのアイコン。姉妹作(咲耶スクランブル)は「暗い四角＋金の枠＋
# ピンクの機体」なので、枠と配色はそのまま揃え、中身だけラリーカーに差し替える。
#
# 真上から見た形（ゲーム中の自機と同じ向き）も試したが、32pxではただの
# ピンクの塊にしか見えなかった。横から見た形の方が、小さくても一目で車と分かる。
BG   = (0x15,0x0f,0x1a,255)   # --bg
GOLD = (0xe8,0xc5,0x6a,255)   # --gold  枠・ヘッドライト・ホイール
PINK = (0xff,0x2d,0x9b,255)   # --pink  咲耶カー
DARK = (0x3d,0x24,0x3d,255)   # --wall2 窓・タイヤ
TIRE = (0x1d,0x12,0x1d,255)   # タイヤは背景より少しだけ明るく

SS = 8   # スーパーサンプリング

def draw(size):
    S = size*SS
    im = Image.new('RGBA',(S,S),BG)
    d  = ImageDraw.Draw(im)
    u  = S/180.0

    bw = round(7*u)
    d.rectangle([0,0,S-1,S-1], outline=GOLD, width=bw)

    def P(pts): return [(x*u, y*u) for x,y in pts]

    # 車体（横から）。後ろ(左)が高く、前(右)へ向かって低くなる
    body = P([(22,74),(48,74),(64,44),(114,44),(136,76),(160,82),
              (164,100),(154,113),(30,113),(20,98)])
    d.polygon(body, fill=PINK)

    # リアスポイラー。32pxで消えない程度の太さにする
    d.rectangle(P([(16,62),(40,74)]), fill=PINK)

    # 窓
    d.polygon(P([(68,50),(108,50),(124,74),(68,74)]), fill=DARK)
    # ⌐◨-◨ の気配。長い帯にするとブラインドに見えるので、四角を2つだけ
    for x0 in (76, 96):
        d.rectangle(P([(x0,58),(x0+12,68)]), fill=(0xa8,0x8a,0xa8,255))

    # ヘッドライト（進行方向＝右）
    d.polygon(P([(150,86),(163,88),(163,98),(150,98)]), fill=GOLD)

    # ホイールアーチ。タイヤの上半分を車体で隠す
    for wx in (60, 128):
        d.pieslice(P([(wx-27, 110-27),(wx+27, 110+27)]), 180, 360, fill=PINK)

    # タイヤ（下半分だけ見せる）
    for wx in (60, 128):
        d.pieslice(P([(wx-24, 110-24),(wx+24, 110+24)]), 0, 180, fill=TIRE)
        d.pieslice(P([(wx-12, 110-12),(wx+12, 110+12)]), 0, 180, fill=GOLD)
        d.pieslice(P([(wx-5,  110-5 ),(wx+5,  110+5 )]), 0, 180, fill=DARK)

    return im.resize((size,size), Image.LANCZOS)

for size, path in [(180, sys.argv[1]), (32, sys.argv[2])]:
    draw(size).convert('RGB').save(path, optimize=True)
    print('wrote', path, size)
