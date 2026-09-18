/* =========================
SONG DATABASE
========================= */

let songs = [];

/* =========================
PLAYLIST
========================= */

let playlist = [
{
name: "Tamil Hits",
songs: []
}
];

/* =========================
ELEMENTS
========================= */

const audio = document.getElementById("audio");
const songBox = document.getElementById("songs");
const title = document.getElementById("title");
const artist = document.getElementById("artist");
const cover = document.getElementById("cover");
const playBtn = document.getElementById("play");
const playlistBox = document.getElementById("playlist");

const progress = document.getElementById("progress");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const volume = document.getElementById("volume");
const likeBtn = document.getElementById("likeBtn");
const searchInput = document.getElementById("search");

/* =========================
PLAYER STATE
========================= */

let current = 0;
let isLoading = false;

/* =========================
DEFAULT COVER
========================= */

const DEFAULT_COVER = "img/default.jpg";

/* =========================
HELPERS
========================= */

function formatTime(time) {

if (!Number.isFinite(time)) {
    return "0:00";
}

const minutes = Math.floor(time / 60);
const seconds = Math.floor(time % 60);

return `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;

}

function escapeHTML(value) {

return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

/* =========================
GET SONG DETAILS
========================= */

async function getSongDetails(songName) {

try {

    const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(songName)}&media=music&limit=1`
    );

    if (!response.ok) {
        throw new Error("iTunes request failed");
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {

        const result = data.results[0];

        return {
            artist: result.artistName || "Unknown Artist",

            img: result.artworkUrl100
                ? result.artworkUrl100.replace(
                    "100x100",
                    "600x600"
                )
                : DEFAULT_COVER
        };
    }

} catch (error) {

    console.log("Song details error:", error);

}

return {
    artist: "Unknown Artist",
    img: DEFAULT_COVER
};

}

/* =========================
GITHUB SONG SOURCE
========================= */

const githubAPI =
"https://api.github.com/repos/master2020k/spotifymode/contents/songs";

/* =========================
LOAD GITHUB SONGS
========================= */

async function loadGithubSongs() {

isLoading = true;

showMessage("Loading songs...");

try {

    const response = await fetch(githubAPI);

    if (!response.ok) {
        throw new Error(
            `GitHub API error: ${response.status}`
        );
    }

    const files = await response.json();

    songs = files

        .filter(file =>
            file.type === "file" &&
            (
                file.name.toLowerCase().endsWith(".mp3") ||
                file.name.toLowerCase().endsWith(".m4a") ||
                file.name.toLowerCase().endsWith(".wav")
            )
        )

        .map(file => {

            let songName = file.name
                .replace(/\.(mp3|m4a|wav)$/i, "")
                .replaceAll("-", " ")
                .replaceAll("_", " ");

            return {
                name: songName,
                artist: "Loading...",
                file: file.download_url,
                img: DEFAULT_COVER
            };

        });

    if (songs.length === 0) {

        showMessage("No songs found in GitHub.");

        return;
    }

    /*
     * Fetch artwork/artist information.
     * Promise.all makes this much faster than
     * waiting for every request one-by-one.
     */

    await Promise.all(

        songs.map(async song => {

            const details =
                await getSongDetails(song.name);

            song.artist = details.artist;
            song.img = details.img;

        })

    );

    playlist[0].songs =
        songs.map((song, index) => index);

    loadSongs();
    loadPlaylist();

} catch (error) {

    console.error("GitHub Error:", error);

    showMessage(
        "Unable to load songs. Check your GitHub repository."
    );

} finally {

    isLoading = false;

}

}

/* =========================
INITIAL LOAD
========================= */

loadGithubSongs();

/* =========================
MESSAGE
========================= */

function showMessage(message) {

songBox.innerHTML = `
    <div class="empty-message">
        ${escapeHTML(message)}
    </div>
`;

}

/* =========================
LOAD SONG CARDS
========================= */

function loadSongs(songList = songs) {

songBox.innerHTML = "";

if (!songList.length) {

    showMessage("No songs found.");

    return;
}

songList.forEach((song, index) => {

    const originalIndex =
        songs.indexOf(song);

    songBox.innerHTML += `

        <div
            class="card"
            data-index="${originalIndex}"
            onclick="playSong(${originalIndex})"
        >

            <img
                loading="lazy"
                src="${escapeHTML(song.img)}"
                alt="${escapeHTML(song.name)}"
                onerror="this.src='${DEFAULT_COVER}'"
            >

            <h3>
                ${escapeHTML(song.name)}
            </h3>

            <p>
                ${escapeHTML(song.artist)}
            </p>

        </div>

    `;

});

highlightSong();

}

/* =========================
PLAY SONG
========================= */

async function playSong(index) {

if (!songs.length) {
    return;
}

if (!songs[index]) {
    return;
}

current = index;

const song = songs[current];

title.innerText = song.name;
artist.innerText = song.artist;

cover.src = song.img || DEFAULT_COVER;

cover.onerror = () => {
    cover.src = DEFAULT_COVER;
};

audio.src = song.file;

updateLikeButton();
highlightSong();

try {

    await audio.play();

    setPlayingIcon(true);

} catch (error) {

    console.log("Play error:", error);

    setPlayingIcon(false);

}

}

/* =========================
PLAY / PAUSE
========================= */

function playPause() {

if (!songs.length) {
    return;
}

if (!audio.src) {

    playSong(current);

    return;
}

if (audio.paused) {

    audio.play()
        .then(() => {
            setPlayingIcon(true);
        })
        .catch(error => {
            console.log("Play error:", error);
        });

} else {

    audio.pause();

    setPlayingIcon(false);

}

}

/* =========================
PLAY ICON
========================= */

function setPlayingIcon(isPlaying) {

if (isPlaying) {

    playBtn.innerHTML =
        `<i class="fa-solid fa-pause"></i>`;

} else {

    playBtn.innerHTML =
        `<i class="fa-solid fa-play"></i>`;

}

}

/* =========================
NEXT SONG
========================= */

function next() {

if (!songs.length) {
    return;
}

current++;

if (current >= songs.length) {
    current = 0;
}

playSong(current);

}

/* =========================
PREVIOUS SONG
========================= */

function previous() {

if (!songs.length) {
    return;
}

/*
 * If song has already played for more than
 * 3 seconds, restart the same song.
 */

if (audio.currentTime > 3) {

    audio.currentTime = 0;

    return;
}

current--;

if (current < 0) {
    current = songs.length - 1;
}

playSong(current);

}

/* =========================
AUTO NEXT
========================= */

audio.addEventListener("ended", () => {

next();

});

/* =========================
AUDIO PLAY EVENT
========================= */

audio.addEventListener("play", () => {

setPlayingIcon(true);

});

/* =========================
AUDIO PAUSE EVENT
========================= */

audio.addEventListener("pause", () => {

setPlayingIcon(false);

});

/* =========================
PROGRESS
========================= */

audio.addEventListener("timeupdate", () => {

if (!Number.isFinite(audio.duration)) {
    return;
}

const percentage =
    (audio.currentTime / audio.duration) * 100;

progress.value = percentage;

currentTime.innerText =
    formatTime(audio.currentTime);

duration.innerText =
    formatTime(audio.duration);

});

/* =========================
AUDIO METADATA
========================= */

audio.addEventListener("loadedmetadata", () => {

duration.innerText =
    formatTime(audio.duration);

});

/* =========================
SEEK
========================= */

progress.addEventListener("input", () => {

if (!Number.isFinite(audio.duration)) {
    return;
}

audio.currentTime =
    (Number(progress.value) / 100) *
    audio.duration;

});

/* =========================
VOLUME
========================= */

volume.addEventListener("input", () => {

audio.volume =
    Number(volume.value);

});

audio.volume = Number(volume.value);

/* =========================
PLAYLIST
========================= */

function loadPlaylist() {

playlistBox.innerHTML = "";

playlist.forEach((list, index) => {

    playlistBox.innerHTML += `

        <div
            class="card"
            onclick="openPlaylist(${index})"
        >

            <h3>
                ${escapeHTML(list.name)}
            </h3>

            <p>
                ${list.songs.length} Songs
            </p>

        </div>

    `;

});

}

/* =========================
OPEN PLAYLIST
========================= */

function openPlaylist(index) {

if (!playlist[index]) {
    return;
}

const selectedPlaylist =
    playlist[index];

songBox.innerHTML = "";

if (!selectedPlaylist.songs.length) {

    showMessage("This playlist is empty.");

    return;
}

selectedPlaylist.songs.forEach(songIndex => {

    const song = songs[songIndex];

    if (!song) {
        return;
    }

    songBox.innerHTML += `

        <div
            class="card"
            data-index="${songIndex}"
            onclick="playSong(${songIndex})"
        >

            <img
                src="${escapeHTML(song.img)}"
                alt="${escapeHTML(song.name)}"
                onerror="this.src='${DEFAULT_COVER}'"
            >

            <h3>
                ${escapeHTML(song.name)}
            </h3>

            <p>
                ${escapeHTML(song.artist)}
            </p>

        </div>

    `;

});

highlightSong();

}

/* =========================
HIGHLIGHT ACTIVE SONG
========================= */

function highlightSong() {

document
    .querySelectorAll("#songs .card")
    .forEach(card => {

        card.classList.remove("active");

        if (
            Number(card.dataset.index) ===
            current
        ) {

            card.classList.add("active");

        }

    });

}

/* =========================
SEARCH
========================= */

function searchSongs() {

const text =
    searchInput.value
        .trim()
        .toLowerCase();

if (!text) {

    loadSongs();

    return;
}

const filteredSongs =
    songs.filter(song =>

        song.name
            .toLowerCase()
            .includes(text)

        ||

        song.artist
            .toLowerCase()
            .includes(text)

    );

loadSongs(filteredSongs);

}

/* =========================
FOCUS SEARCH
========================= */

function focusSearch() {

searchInput.focus();

searchInput.scrollIntoView({
    behavior: "smooth",
    block: "center"
});

}

/* =========================
LIKED SONG STORAGE
========================= */

function getLikedSongs() {

try {

    return JSON.parse(
        localStorage.getItem("liked")
    ) || [];

} catch {

    return [];

}

}

/* =========================
SAVE LIKED SONGS
========================= */

function saveLikedSongs(liked) {

localStorage.setItem(
    "liked",
    JSON.stringify(liked)
);

}

/* =========================
LIKE / UNLIKE
========================= */

function like() {

if (!songs.length) {
    return;
}

const liked =
    getLikedSongs();

const existing =
    liked.indexOf(current);

if (existing !== -1) {

    liked.splice(existing, 1);

} else {

    liked.push(current);

}

saveLikedSongs(liked);

updateLikeButton();

}

/* =========================
UPDATE LIKE BUTTON
========================= */

function updateLikeButton() {

const liked =
    getLikedSongs();

if (liked.includes(current)) {

    likeBtn.innerHTML =
        `<i class="fas fa-heart"></i>`;

    likeBtn.style.color = "#1db954";

} else {

    likeBtn.innerHTML =
        `<i class="far fa-heart"></i>`;

    likeBtn.style.color = "";

}

}

/* =========================
SHOW LIKED SONGS
========================= */

function showLiked() {

const liked =
    getLikedSongs();

const validLiked =
    liked.filter(index =>
        songs[index]
    );

songBox.innerHTML = "";

if (!validLiked.length) {

    showMessage("No liked songs yet ❤️");

    return;
}

validLiked.forEach(index => {

    const song = songs[index];

    songBox.innerHTML += `

        <div
            class="card"
            data-index="${index}"
            onclick="playSong(${index})"
        >

            <img
                src="${escapeHTML(song.img)}"
                alt="${escapeHTML(song.name)}"
                onerror="this.src='${DEFAULT_COVER}'"
            >

            <h3>
                ${escapeHTML(song.name)}
            </h3>

            <p>
                ${escapeHTML(song.artist)}
            </p>

        </div>

    `;

});

highlightSong();

}

/* =========================
KEYBOARD CONTROLS
========================= */

document.addEventListener("keydown", event => {

/*
 * Don't trigger shortcuts while
 * typing inside an input.
 */

const tag =
    document.activeElement.tagName;

if (
    tag === "INPUT" ||
    tag === "TEXTAREA"
) {
    return;
}

if (event.code === "Space") {

    event.preventDefault();

    playPause();

}

if (event.code === "ArrowRight") {

    next();

}

if (event.code === "ArrowLeft") {

    previous();

}

});

/* =========================
AUDIO ERROR
========================= */

audio.addEventListener("error", () => {

if (!audio.src) {
    return;
}

console.error(
    "Audio file error:",
    audio.src
);

setPlayingIcon(false);

});

/* =========================
SEARCH ENTER
========================= */

searchInput.addEventListener("keydown", event => {

if (event.key === "Enter") {

    searchSongs();

}

});

/* =========================
RESET PLAYER
========================= */

function resetPlayer() {

audio.pause();

audio.removeAttribute("src");

audio.load();

title.innerText = "Select a Song";
artist.innerText = "Artist";

cover.src = DEFAULT_COVER;

progress.value = 0;

currentTime.innerText = "0:00";
duration.innerText = "0:00";

setPlayingIcon(false);

}

/* =========================
DEBUG INFO
========================= */

console.log(
"Spotify Clone loaded successfully 🎵"
);
