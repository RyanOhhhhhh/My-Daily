"""通过 API 写入江西示例记录"""
import urllib.request
import json
import base64

BASE = "http://localhost:8000"

# 1. 注册用户
req = urllib.request.Request(
    f"{BASE}/api/auth/register",
    data=json.dumps({"username": "demo", "password": "demo123"}).encode(),
    headers={"Content-Type": "application/json"},
)
try:
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read())["access_token"]
    print("✅ 注册/登录成功")
except urllib.error.HTTPError as e:
    # 可能已存在，尝试登录
    req = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=json.dumps({"username": "demo", "password": "demo123"}).encode(),
        headers={"Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read())["access_token"]
    print("✅ 登录成功")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {token}",
}

# 生成一个简单的 SVG 占位图作为 base64 照片
def make_photo_svg(label, color="#42b983"):
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="{color}"/>
  <rect x="40" y="40" width="720" height="520" rx="12" fill="rgba(255,255,255,0.15)"/>
  <text x="400" y="280" text-anchor="middle" font-family="system-ui,sans-serif" font-size="42" fill="white" font-weight="bold">{label}</text>
  <text x="400" y="340" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" fill="rgba(255,255,255,0.8)">My Daily · 记录生活的点滴</text>
</svg>"""
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()

records = [
    {
        "title": "登滕王阁",
        "location": "南昌·滕王阁",
        "lat": 28.6842,
        "lng": 115.8756,
        "record_date": "2026-05-10T09:30:00",
        "content": f"""## 落霞与孤鹜齐飞

今天终于到了滕王阁！站在阁上远眺赣江，真的能感受到王勃笔下的壮阔景象。

![滕王阁]({make_photo_svg("滕王阁","#c0392b")})

> 落霞与孤鹜齐飞，秋水共长天一色。

赣江两岸高楼林立，古今交融，别有一番风味。
""",
    },
    {
        "title": "庐山云雾",
        "location": "九江·庐山含鄱口",
        "lat": 29.5618,
        "lng": 115.9867,
        "record_date": "2026-05-11T07:15:00",
        "content": f"""## 不识庐山真面目

早起去含鄱口看日出，虽然云雾缭绕没看到太阳，但这仙境般的景色也值了。

![庐山云雾]({make_photo_svg("庐山云雾","#2980b9")})

山间的云海翻涌如浪，远处的鄱阳湖若隐若现，美不胜收。
""",
    },
    {
        "title": "婺源篁岭晒秋",
        "location": "上饶·婺源篁岭",
        "lat": 29.2480,
        "lng": 117.8386,
        "record_date": "2026-05-12T14:00:00",
        "content": f"""## 古村晒秋

篁岭的晒秋真的名不虚传，家家户户的屋顶上都晒满了农作物，五彩斑斓。

![篁岭晒秋]({make_photo_svg("篁岭晒秋","#e67e22")})

走在青石板路上，看着徽派建筑和马头墙，时间仿佛都慢了下来。
""",
    },
    {
        "title": "景德镇学做陶瓷",
        "location": "景德镇·古窑民俗博览区",
        "lat": 29.2945,
        "lng": 117.2034,
        "record_date": "2026-05-13T10:00:00",
        "content": f"""## 泥与火的艺术

在古窑亲手体验了拉坯，看起来简单做起来真不容易。师傅随手一拉就是一个完美的碗，我拉了半天歪歪扭扭的哈哈。

![景德镇陶瓷]({make_photo_svg("景德镇陶瓷","#8e44ad")})

不过最后成品还挺像那么回事的，等烧好了再来取！
""",
    },
    {
        "title": "三清山奇峰",
        "location": "上饶·三清山",
        "lat": 28.8923,
        "lng": 118.0624,
        "record_date": "2026-05-14T08:45:00",
        "content": f"""## 西海岸栈道

三清山的西海岸栈道建在悬崖绝壁上，走起来腿都有点软。但是风景无敌！

![三清山]({make_photo_svg("三清山","#16a085")})

巨蟒出山、东方女神，这些花岗岩奇峰真的太震撼了。
""",
    },
]

for r in records:
    body = json.dumps(r).encode()
    req = urllib.request.Request(
        f"{BASE}/api/records",
        data=body,
        headers=headers,
    )
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f"✅ {r['title']} — ID: {result['id']}")
    except urllib.error.HTTPError as e:
        print(f"❌ {r['title']} — {e.code}: {e.read().decode()[:100]}")

print("\n🎉 完成！刷新前端页面查看。")
