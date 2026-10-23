let songs = [];
let activeCategory = "全部";

const featuredContainer = document.querySelector("#featured-tracks");
const categoryContainer = document.querySelector("#categories");
const songListContainer = document.querySelector("#song-list");
const searchInput = document.querySelector("#search");
const shuffleButton = document.querySelector("#shuffle-btn");

async function loadSongs() {
  try {
    const response = await fetch("./songs.json");
    if (!response.ok) throw new Error("无法读取 songs.json");

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("songs.json 最外层必须是数组");

    // 兼容新版 category 字段和旧版 categories 字段
    songs = data.map((song, index) => {
      const categories = Array.isArray(song.categories)
        ? song.categories
        : (song.category ? [song.category] : []);

      return {
        id: song.id ?? index + 1,
        title: String(song.title ?? ""),
        artist: String(song.artist ?? ""),
        category: categories[0] ?? "",
        categories,
        tags: Array.isArray(song.tags) ? song.tags : []
      };
    });

    renderFeatured();
    renderCategories();
    renderSongList();
  } catch (error) {
    console.error("歌曲数据加载失败：", error);
    featuredContainer.textContent = "歌曲加载失败，请检查 songs.json 文件及运行方式。";
    categoryContainer.textContent = "分类加载失败。";
    songListContainer.textContent = "歌单加载失败。";
  }
}

// 从完整歌单随机抽取五首，不再依赖每首歌曲预先标记 featured: true
function pickRandomSongs(count = 5) {
  const pool = [...songs];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function renderFeatured() {
  const featuredSongs = pickRandomSongs(5);
  featuredContainer.innerHTML = "";

  featuredSongs.forEach(song => {
    const card = document.createElement("article");
    card.className = "track-card";

    const title = document.createElement("h3");
    title.textContent = song.title;

    const artist = document.createElement("p");
    artist.textContent = song.artist || "歌手待补充";

    const tags = document.createElement("p");
    tags.className = "track-tags";
    tags.textContent = song.tags.join(" · ");
    if (!song.tags.length) tags.hidden = true;

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "复制歌名";
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(song.title);
        copyButton.textContent = "复制成功！";
        setTimeout(() => { copyButton.textContent = "复制歌名"; }, 1200);
      } catch {
        alert("复制失败，请检查浏览器权限。");
      }
    });

    card.append(title, artist, tags, copyButton);
    featuredContainer.appendChild(card);
  });
}

function renderCategories() {
  // 从 songs.json 的 category 字段动态生成四个分类，保留“摇滚！！”
  const categories = [
    "全部",
    ...new Set(songs.map(song => song.category).filter(Boolean))
  ];

  if (!categories.includes(activeCategory)) activeCategory = "全部";
  categoryContainer.innerHTML = "";

  categories.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.className =
      category === activeCategory ? "category-btn active" : "category-btn";

    button.addEventListener("click", () => {
      activeCategory = category;
      renderCategories();
      renderSongList();
    });

    categoryContainer.appendChild(button);
  });
}

function renderSongList() {
  const keyword = searchInput.value.trim().toLowerCase();

  const filteredSongs = songs.filter(song => {
    const categoryMatch =
      activeCategory === "全部" || song.categories.includes(activeCategory);
    const searchMatch =
      song.title.toLowerCase().includes(keyword) ||
      song.artist.toLowerCase().includes(keyword);
    return categoryMatch && searchMatch;
  });

  songListContainer.innerHTML = "";
  if (!filteredSongs.length) {
    songListContainer.textContent = "没有找到符合条件的歌曲。";
    return;
  }

  filteredSongs.forEach(song => {
    const row = document.createElement("div");
    row.className = "song-row";

    const number = document.createElement("span");
    number.className = "song-number";
    number.textContent = song.id;

    const info = document.createElement("div");
    info.className = "song-info";

    const title = document.createElement("strong");
    title.textContent = song.title;
    title.title = "点击复制歌名";
    title.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(song.title);
        const originalTitle = song.title;
        title.textContent = "已复制：" + originalTitle;
        setTimeout(() => { title.textContent = originalTitle; }, 1000);
      } catch {
        alert("复制失败，请检查浏览器权限。");
      }
    });

    const artist = document.createElement("span");
    artist.textContent = song.artist || "歌手待补充";

    info.append(title, artist);
    row.append(number, info);
    songListContainer.appendChild(row);
  });
}

shuffleButton.addEventListener("click", renderFeatured);
searchInput.addEventListener("input", renderSongList);
loadSongs();

/* LIVEWIRE：开屏自动退出与跳过功能 */
const introScreen = document.getElementById("intro-screen");
const introSkipButton = document.getElementById("intro-skip");

function closeIntro() {
  if (!introScreen || introScreen.classList.contains("is-leaving")) {
    return;
  }

  introScreen.classList.add("is-leaving");

  // 开屏结束时，重新尝试启动背景视频
  const video = document.getElementById("stageVideo");

  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const startVideo = () => {
      const result = video.play();

      if (result && typeof result.catch === "function") {
        result.catch((error) => {
          console.warn(
            "[LIVEWIRE] 开屏结束后背景视频播放失败：",
            error.name,
            error.message
          );
        });
      }
    };

    // 立即尝试一次
    startVideo();

    // 如果视频尚未准备好，等可以播放时再尝试
    if (video.readyState < 3) {
      video.addEventListener("canplay", startVideo, { once: true });
    }
  }

  // 淡出结束后彻底移除开屏，避免遮挡主页
  window.setTimeout(() => {
    introScreen.remove();
  }, 700);
}

// 页面打开约 3.3 秒后自动进入主页
if (introScreen) {
  window.setTimeout(closeIntro, 3300);
}

// 点击跳过，立即进入主页
if (introSkipButton) {
  introSkipButton.addEventListener("click", closeIntro);
}
// LIVEWIRE 背景视频兼容性处理
(() => {
  const video = document.getElementById("stageVideo");

  if (!video) {
    console.warn("[LIVEWIRE] 没有找到背景视频元素");
    return;
  }

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");

  let retryTimer = null;

  const tryPlay = () => {
    if (!video.paused && !video.ended) return;

    const result = video.play();

    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        console.warn(
          "[LIVEWIRE] 背景视频播放失败：",
          error.name,
          error.message
        );
      });
    }
  };

  // 视频加载完成后尝试播放
  video.addEventListener("canplay", tryPlay);

  video.addEventListener("error", () => {
    console.error(
      "[LIVEWIRE] 视频加载失败",
      video.error ? video.error.code : "未知错误",
      video.currentSrc
    );
  });

  // 页面初次加载时尝试播放
  tryPlay();

  // 页面恢复显示时再次尝试
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) tryPlay();
  });

  window.addEventListener("pageshow", tryPlay);

  // 页面加载后短暂重试，避免视频初始化时机不一致
  let attempts = 0;
  retryTimer = window.setInterval(() => {
    attempts++;

    if (!video.paused && !video.ended) {
      clearInterval(retryTimer);
      return;
    }

    tryPlay();

    if (attempts >= 8) {
      clearInterval(retryTimer);
    }
  }, 1000);

  // 首次触摸/点击时，让背景视频淡入，营造“触摸后舞台亮起”的效果
  let hasRevealed = false;
  const revealVideo = () => {
    if (!hasRevealed) {
      hasRevealed = true;
      video.classList.add("is-revealed");
    }
    tryPlay();
  };

  document.addEventListener("pointerdown", revealVideo, {
    once: true,
    passive: true
  });
  // 兼容部分较旧的移动浏览器
  document.addEventListener("touchstart", revealVideo, {
    once: true,
    passive: true
  });
  document.addEventListener("click", revealVideo, { once: true });
})();
