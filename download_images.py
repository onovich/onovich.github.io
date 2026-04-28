#!/usr/bin/env python3
"""
Download Cargo CDN images with Referer header.
Run from <PROJECT_ROOT>
"""
import urllib.request
import os
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(ROOT, 'site', 'public', 'images')

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://onovich.com/',
    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
}

IMAGES = {
    "profile": [
        ("avatar.jpg", "https://freight.cargo.site/t/original/i/96c1a1e29b9212728b8b0d80c7306e7cc66e876b2ba289a19dd34914b12b23b8/KAmNL_Zp_400x400.jpg"),
    ],
    "codes": [
        ("loom.png",    "https://freight.cargo.site/t/original/i/671533e2f9dcfe9a55af81f235ffbd39f10423bc66c9b96263c19070a4d2b2a8/codecover_loom_overlay.png"),
        ("choir.png",   "https://freight.cargo.site/t/original/i/16336f4e105e869a3d885715fd85bdcf3ea9b1cb3f9d265c3e1e81b093fad719/codecover_choir2.png"),
        ("prism.png",   "https://freight.cargo.site/t/original/i/f097cb1fa232806b79bc9473f7b640727cd8876edfe970890b87cd960b29b282/gamecover_prism.png"),
        ("capsule.png", "https://freight.cargo.site/t/original/i/a0fc86f2ec4b301d7f9dbca43f4ac2f69499061ee7c1dbc395e8ab1d84fdf23b/gamecover_capsule.png"),
        ("scape.png",   "https://freight.cargo.site/t/original/i/54422ddcd77ff9b898d9399ccc3ae7032c4caf2c0cf6a4314bc5eb9e987ca206/codecover_scape.png"),
        ("vista.png",   "https://freight.cargo.site/t/original/i/4b836426941e45e7e9f3fae6dc681f73a8cd404fc1cdac9963a51b6c26eac191/gamecover_visita.png"),
        ("pulse.png",   "https://freight.cargo.site/t/original/i/4c953871eae42faa64b8bc3732728fe7f9542303d04e6629db59daf9e2ac0177/gamecover_pulse.png"),
        ("litio.png",   "https://freight.cargo.site/t/original/i/05ec2ed5f5b39ace5654c391f9485d31e7fb5f026535df8ce93e6467f61df638/codecover_litio.png"),
        ("rill.png",    "https://freight.cargo.site/t/original/i/8a5c2e2380356b0b39b8dcd69d7fdd8ad766b2033a7f9da31befd2d438f1ff27/gamecover_rill.png"),
        ("swing.png",   "https://freight.cargo.site/t/original/i/cd040bda11896bc40223e68382aead7672c87b7c8ec8069cd6352ba755740b82/codecover_swing.png"),
        ("lancet.png",  "https://freight.cargo.site/t/original/i/4feb5726c5b36ae4e9078b7d5ac8824da4c59158bdc472d1d365573bba0c3814/codecover_lancet.png"),
        ("toaster.png", "https://freight.cargo.site/t/original/i/755c707a6f2c6c7af1ccfb1519d244d92127907d4c6a69ec8c56588a76e98658/codecover_toaster.png"),
        ("compass.png", "https://freight.cargo.site/t/original/i/33f4a02fad2476a69e74a649d2df2cce231d5aeb96301f5ad94e764892e6eaa3/codecover_compass.png"),
        ("knot.png",    "https://freight.cargo.site/t/original/i/0a0ecb1eda3d747300764a70c7a65bc56ba07d26b3d827f026f9bb376265f371/codecover_knot.png"),
    ],
    "games": [
        ("ninja-ming.png",     "https://freight.cargo.site/t/original/i/247399bdb638fcb448a5bf3269ca4deb5bac65318bad9720774b70356ed2f975/ninjaming.png"),
        ("ninja-ming-wu.png",  "https://freight.cargo.site/t/original/i/64b070cd4ea4f004c603ddfd101008fa31a4ca78e2b87a215492b376556484b8/ninjamingwu.png"),
        ("air.png",            "https://freight.cargo.site/t/original/i/91f927d0b575a105fe60a92b6904debaee8af3782acde14a0dcbe6fbd6046c8d/gamecover_Air.png"),
        ("oshi.png",           "https://freight.cargo.site/t/original/i/6b3c1e21efb1f7aebf6c55fac5e8c0b9805b3a33817d380a565dce5619968ad6/gamecover_oshi.png"),
        ("alter.png",          "https://freight.cargo.site/t/original/i/6ebfb6950e108cbbefa4441d0d243d7d2f263f53fab6b999443c4127b73c65e1/gamecover_alter.png"),
        ("leap.png",           "https://freight.cargo.site/t/original/i/ae83b391bc69431a3f1b18590727f102e7f690de254c788741e2f36d211b2030/gamecover_leap.png"),
        ("zangeki60s.png",     "https://freight.cargo.site/t/original/i/8914cdeedca8e89d4e6e5f5ad275b82e02116af3c62c09e95cafadcebd15f17c/gamecover_zangeki.png"),
        ("ping.png",           "https://freight.cargo.site/t/original/i/189b4b1986414b53fca30957a18fdfb752e84e70acaa5b0a094d102984dd2ccb/gamecover_ping.png"),
        ("frogvillage.png",    "https://freight.cargo.site/t/original/i/ae17c7e5311ee26e5d9c8e7f4990e45b10b493e13ebb7a42804e77545a64423a/gamecover_frogvillage.png"),
        ("villagetd.png",      "https://freight.cargo.site/t/original/i/4609abbb9884f28a6d5c3c65298ab49e232d59a12d92939004558f3c19d4a26a/gamecover_td.png"),
        ("silence.png",        "https://freight.cargo.site/t/original/i/7bf008e87da4db2c52849337892120b47c2d6b0e7f61c497b24854ea7c8067f7/silentSample.png"),
        ("flow.png",           "https://freight.cargo.site/t/original/i/25cd919fded7c81491e4f51772bfd53ea3d130fee2167f9b5c05b20522d23b8a/sample12.png"),
        ("alien-stalker.png",  "https://freight.cargo.site/t/original/i/aee316d68a2d0051fa71b644858f480e25b97b6efd27fb5d8125af236a15d086/sampleTitle.png"),
        ("lzl.png",            "https://freight.cargo.site/t/original/i/f27829a2f8d83a4896706c50ab9ec188143521cb7d8a82da45b91d9a22d2a504/gamecover_treeroads.png"),
        ("wuxjl.png",          "https://freight.cargo.site/t/original/i/d4821b81a7b274f324d0643fb2778b710caadc18cd167ca4db6498ee17fffc1a/gamecover_club.png"),
    ],
    "pixel": [
        ("frog-park.jpg",          "https://freight.cargo.site/t/original/i/b2a008c0228ef6c20b2b77aeff7dcb2de2117f668410f29ec42a2e02fa367531/frog2022-mini.jpg"),
        ("frog-park-2.jpg",        "https://freight.cargo.site/t/original/i/d8645f0bcf3968fed6b2b9a9a599d9960b7f3cb02acc30c8d636fa19cda9a563/frog2022-2-mini.jpg"),
        ("jygs.png",               "https://freight.cargo.site/t/original/i/79d7592d960e5684e3a27214edda33e543dd868d713774ee2ba0de85dddb744a/de3-copy-46.png"),
        ("action-1.gif",           "https://freight.cargo.site/t/original/i/61f259d145a1dfcb39e01a81853f4cf38cdf1527ecbd0c6da59ae7595d290a47/0.gif"),
        ("action-2.gif",           "https://freight.cargo.site/t/original/i/4d32be2ea66c8a08ed0fb8f4092eb5c88bc4f3ed69811d00eac795e93be8dabd/.gif"),
        ("fly-dragon-fox.png",     "https://freight.cargo.site/t/original/i/5928aa091157a80fda4ab5ba861644b120aa62ad3be8c58117d8435028509318/de3-copy-49.png"),
        ("jian-lai.gif",           "https://freight.cargo.site/t/original/i/a518ab5927f6add4bd8b1c21cba0f8322d53ea55dd930a82e68cf1cd3b568145/.gif"),
        ("action-3.gif",           "https://freight.cargo.site/t/original/i/67279bac2b3ad10e99e50e5b206f81bc666567648fa40d36f716dc36f8c707b6/.gif"),
        ("fly-dragon-ghost.png",   "https://freight.cargo.site/t/original/i/46cf8e994fbf1a0a7df6c132521e2663904bfc9907ab9af31f7ee51c35221795/de3-copy-39.png"),
        ("sanxue.gif",             "https://freight.cargo.site/t/original/i/70769353094913cb0b8f72f8a3876bff71564a4d04d1ae3f689e1a276633e937/.gif"),
        ("shaonian-pi.gif",        "https://freight.cargo.site/t/original/i/0c6af231137c216943b6fff4b9756f2bb450e16afef4f040411edda1226f490a/.gif"),
        ("evil-knight.gif",        "https://freight.cargo.site/t/original/i/045a400340656b6eb0a594aa96e5ea8c6847ddfe670ab310977b790c42aeb310/.gif"),
        ("ae86.gif",               "https://freight.cargo.site/t/original/i/39aead8e74f8a8c9758e75252ab1634610f2dbc4cb88724ecc3571fc53186f72/ae860012.gif"),
        ("dongsen-1.jpg",          "https://freight.cargo.site/t/original/i/3bb00082d1bc59f6b2fe46799437e49a03ab76d21cf6bc1b81d3909c591ceb09/IMG_6966.JPG"),
        ("dongsen-2.jpg",          "https://freight.cargo.site/t/original/i/8dfe0e47572664d30debaa11313aaa7a4acd76acf4e3aae7c8ba1a2c5c751f32/IMG_6965.JPG"),
        ("pixel-heads-1.png",      "https://freight.cargo.site/t/original/i/8bf07d1a8711e77132caf8f2dde60812e0889114ce31091fc9835fecade6e375/de3-copy-41.png"),
        ("pixel-heads-2.png",      "https://freight.cargo.site/t/original/i/abe271d53906fd3ce76fd917579805a9f78bf5e2251c70638b602f5091a7a8bb/de3-copy-47.png"),
        ("xin-li-ming.jpg",        "https://freight.cargo.site/t/original/i/0fc095210090e332dd3b6b06b0192b66526f8c1c10bfc293df51db622bad12d1/2001.jpg"),
        ("self-portrait.gif",      "https://freight.cargo.site/t/original/i/a2100c2f096388b19578fde58119c24081fc43cf3cd1ac8733f1c977d2439c2f/fixed.gif"),
        ("special-beam.png",       "https://freight.cargo.site/t/original/i/fde47d93c13c76149deef3cf9b8598c3b4e4cac6b212bb4497a792cd9ada3cfa/de3-copy-45.png"),
    ],
    "illustrations": [
        ("yx1.jpg",  "https://freight.cargo.site/t/original/i/160c6869291f3a2f2d53b1585910bf7130c6e654e7505a67c459b1d1c48fb3b7/yx1.jpg"),
        ("yx3.jpg",  "https://freight.cargo.site/t/original/i/8a796b079bad76d9c6d5df2d667bdf4702c5d3d0ea202cdd7dcf50469cc588eb/yx3.jpg"),
        ("yx4.jpg",  "https://freight.cargo.site/t/original/i/948b07313f6d316c5c5d276fae6f07570dcd2cc257ff2d05753766253239637e/yx4.jpg"),
        ("yx5.jpg",  "https://freight.cargo.site/t/original/i/3191c0f3cc8b44b26c55aa5ad9065ae2f9ee478a6e80ddeef80e0bfeeca1f789/yx5.jpg"),
        ("yx6.jpg",  "https://freight.cargo.site/t/original/i/702a38b1ade26219b1f87ec599eb4411ba247babc97d52df95cbb2e8d961afc7/yx6.jpg"),
        ("hzz.jpg",  "https://freight.cargo.site/t/original/i/65bd5a58b42b72be1e5da2ea6fbf00e18fc6578f04bde7c0cb229823cc2a7881/hzz.jpg"),
        ("lw.jpg",   "https://freight.cargo.site/t/original/i/669f4659bda189ace4ddadf45e146796fd1efac92e06ae6bb6de0e2cd1a136a8/lw.jpg"),
        ("bl.jpg",   "https://freight.cargo.site/t/original/i/b6e2db4a74d15d9078e9a0b50ba6a7b7a2b535fcf33a84e87fb7a6527a374ee6/bl.jpg"),
        ("128.gif",  "https://freight.cargo.site/t/original/i/7d6f7790a5ab7291386d76e69cd4b0e8c70fe31ceb2c6b19fad3b5bf34df5fc3/_128_.gif"),
        ("img-6962.jpg", "https://freight.cargo.site/t/original/i/1f31bbe093a19e3e95997031758c082c56b55657532edd97a8bf0d30936dd01d/IMG_6962.JPG"),
        ("img-6963.jpg", "https://freight.cargo.site/t/original/i/cfb4b3df54976e7457424007e8f67bbb923e57c768e8509d0717aadb75728c75/IMG_6963.JPG"),
        ("img-6964.jpg", "https://freight.cargo.site/t/original/i/84c6dbfa47a189ef3d6820e56efbf298d463b827b84ee45785bd933f8dd7c0bf/IMG_6964.JPG"),
        ("illus-01.jpg", "https://freight.cargo.site/t/original/i/01a1e6912654381bf3737d305a713e7cf71dfec0d8509e372fbd9109a9777a26/.jpg"),
        ("illus-02.jpg", "https://freight.cargo.site/t/original/i/2489a1c4f867d2050e017595905ae43ee94fe88dfdcc73fa32bf7bbdfb0b33b2/.jpg"),
        ("illus-03.jpg", "https://freight.cargo.site/t/original/i/4a8e644aa9b2a89965c8d4a5f8c4bc4f18b3125bf9d110f38bbd4c26b858c7b6/.jpg"),
    ],
    "gifs": [
        ("00bxc.gif",       "https://freight.cargo.site/t/original/i/05c32753178c5ca5d0a02c460a51e8021406b5d2a1161864c4372586312da82c/00bxc.gif"),
        ("bottlea01.gif",   "https://freight.cargo.site/t/original/i/123b0f98acf214dd0d44123a5506919c6261df6d6760e86a7357a0c65fb18e46/bottlea01.gif"),
        ("tx00.gif",        "https://freight.cargo.site/t/original/i/33c39fbb850e324eceae5b73969813ceb9810929c441fc5c1504fdb6e06e471c/tx00.gif"),
        ("jn2.gif",         "https://freight.cargo.site/t/original/i/3f644562d44f72d6650f7d6c1f97c170613573f122dd3f227be6dca8ecc0bdf9/jn2.gif"),
        ("00bbt.gif",       "https://freight.cargo.site/t/original/i/5e8bf5b332614089fe850f11e4c8847f31285963b956dbeee3c1768ebe48251f/00BBT.gif"),
        ("00tt.gif",        "https://freight.cargo.site/t/original/i/83d81f5e3a7f47bbb5345e5c47607efa7ae2e8d72429b81f33ccb4205b8cc438/00tt.gif"),
        ("00swordguy.gif",  "https://freight.cargo.site/t/original/i/c57e21ce2415909624435d7fceaeca0167fd30482121a2b630de7f597505bef7/00swordguy.gif"),
        ("4-1-2.gif",       "https://freight.cargo.site/t/original/i/c995a820dbcb449f8c6dfdede4a329205b1c7791eb167ccdf169067f3f9a5533/4-1-2.gif"),
        ("00xsn.gif",       "https://freight.cargo.site/t/original/i/fd53720844890083073a0a619e7d9758adf554b51ea9c21f2ac87a520edb08ad/00xsn.gif"),
    ],
    "graphics": [
        ("graphic-01.jpg", "https://freight.cargo.site/t/original/i/4ee6bcb7b8cefdff9a7bb630b58844533c9fd38d1a885739a3e2a22146f8426e/p2189205031_web.jpg"),
        ("graphic-02.jpg", "https://freight.cargo.site/t/original/i/81c645b5370d2100268aec72ca0649b446956389263399b298cc219a4b1ff67f/p23580362702.jpg"),
        ("graphic-03.jpg", "https://freight.cargo.site/t/original/i/babdf33b37cf5fed716633e0f9e4358579f0a0b85f2304c45ebb327abd126507/p2358036270.jpg"),
        ("graphic-04.jpg", "https://freight.cargo.site/t/original/i/7e4c8bd4155e056f461b39fd9656cc4f1ea7cf45782ffa64683f18809738ee0c/.jpg"),
        ("graphic-05.jpg", "https://freight.cargo.site/t/original/i/8e311e4da0a084522ffe30f891ff00dc14db98d05d59597799d7a523569b628d/.jpg"),
        ("graphic-06.jpg", "https://freight.cargo.site/t/original/i/c0ef9b42dec4e697528bf684b7193d0fef74b4f3ccaa14ef6d6cd5486628c68c/.jpg"),
    ],
    "photos": [
        ("photo-01.jpg", "https://freight.cargo.site/t/original/i/35a550a9a8a49124af11011c7a1d4748eb5c6edf74874bbf9da7221fd8b76a9b/L1003541.2017.8-.JPG"),
        ("photo-02.jpg", "https://freight.cargo.site/t/original/i/5eeb9da069b42004815562cedf74f24b2aec6464e07dcef04a546c90ed4f0f22/IMG_9519.JPG"),
        ("photo-03.jpg", "https://freight.cargo.site/t/original/i/92d467026577b23ff7d27459cf4ba430b1013f2216b55b53d087b81227cdc459/IMG_7257.JPG"),
        ("photo-04.jpg", "https://freight.cargo.site/t/original/i/b561c03b47193d5e6d2b77b4e3e7215dd28df9cb10bd29d9cec976257b42b501/L1001570_web.jpg"),
        ("photo-05.jpg", "https://freight.cargo.site/t/original/i/b58388dd9accaad57740a449e025a62a97b22cb391c9e019f0e6d72b54194daa/L1002124.2017.7-.JPG"),
        ("photo-06.jpg", "https://freight.cargo.site/t/original/i/de3bfb64bf64af2a7c8d1cb56c6b8c13954e6c50b3480ce4eb094ec49f1dff9f/L1002778.2017.7-.JPG"),
        ("photo-07.jpg", "https://freight.cargo.site/t/original/i/f498b499f4636b5b18ca512ebcb2fa2fa269574cbeff08a8d4a9283de3b3ad50/UNADJUSTEDNONRAW_thumb_55d.jpg"),
    ],
}


def download(url, dest):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    with open(dest, 'wb') as f:
        f.write(data)


total = sum(len(v) for v in IMAGES.values())
done = 0
failed = []

for section, files in IMAGES.items():
    dir_ = os.path.join(IMAGES_DIR, section)
    os.makedirs(dir_, exist_ok=True)
    for filename, url in files:
        dest = os.path.join(dir_, filename)
        if os.path.exists(dest):
            print(f'  [skip] {section}/{filename}')
            done += 1
            continue
        try:
            download(url, dest)
            size = os.path.getsize(dest)
            print(f'  [ok]   {section}/{filename}  ({size // 1024}KB)')
            done += 1
        except Exception as e:
            print(f'  [FAIL] {section}/{filename}: {e}')
            failed.append((section, filename, url, str(e)))
        time.sleep(0.15)

print(f'\nDone: {done}/{total}')
if failed:
    print(f'Failed ({len(failed)}):')
    for s, f, u, e in failed:
        print(f'  {s}/{f}')
    print('\n--- URLs for manual download ---')
    for s, f, u, e in failed:
        print(f'# {s}/{f}')
        print(u)
