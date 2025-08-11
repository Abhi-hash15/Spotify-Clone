console.log('JavaScript Music Player Loaded');

// Global Variables
let currentSong = new Audio();
let songs = [];
let currFolder = "";

// Cache DOM elements
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("previous");
const nextBtn = document.getElementById("next");
const songInfo = document.querySelector(".songinfo");
const songTime = document.querySelector(".songtime");
const circle = document.querySelector(".circle");
const seekbar = document.querySelector(".seekbar");
const volumeRange = document.querySelector(".range input");
const volumeIcon = document.querySelector(".volume > img");
const leftMenu = document.querySelector(".left");
const hamburger = document.querySelector(".hamburger");
const closeBtn = document.querySelector(".close");
const songUL = document.querySelector(".songList ul");
const cardContainer = document.querySelector(".cardContainer");

// Utility: Convert seconds to mm:ss
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Get Songs from Folder
async function getSongs(folder) {
    currFolder = folder;
    let res = await fetch(`/${folder}/`);
    let html = await res.text();

    let div = document.createElement("div");
    div.innerHTML = html;

    let anchors = div.getElementsByTagName("a");
    songs = [];

    for (let a of anchors) {
        if (a.href.endsWith(".mp3")) {
            songs.push(decodeURIComponent(a.href.split(`/${folder}/`)[1]));
        }
    }

    // Display songs in playlist
    songUL.innerHTML = songs
        .filter(song => !!song) // NEW: avoid undefined songs
        .map(song => `
        <li>
          <img class="invert" width="34" src="img/music.svg" alt="">
          <div class="info">
            <div>${song}</div>
            <div>Artist</div>
          </div>
          <div class="playnow">
            <span>Play Now</span>
            <img class="invert" src="img/play.svg" alt="">
          </div>
        </li>
      `).join("");

    // Attach event listeners
    Array.from(songUL.getElementsByTagName("li")).forEach((li, index) => {
        li.addEventListener("click", () => {
            if (songs[index]) {            // NEW: prevent undefined
                playMusic(songs[index]);
            }
        });
    });

    return songs;
}

// Play Music
function playMusic(track, pause = false) {
    if (!track) { // NEW: prevent playing undefined
        songInfo.innerHTML = "";
        songTime.innerHTML = "";
        currentSong.pause();
        return;
    }
    currentSong.src = `/${currFolder}/` + track;
    if (!pause) {
        currentSong.play();
        playBtn.src = "img/pause.svg";
    }
    songInfo.innerHTML = decodeURI(track);
    songTime.innerHTML = "00:00 / 00:00";
}

// Display Albums
async function displayAlbums() {
    console.log("Displaying albums...");
    let res = await fetch(`/songs/`);
    let html = await res.text();
    let div = document.createElement("div");
    div.innerHTML = html;
    let anchors = div.getElementsByTagName("a");

    for (let e of anchors) {
        if (e.href.includes("/songs") && !e.href.includes(".htaccess")) {
            // Correct folder extraction
            let pathname = new URL(e.href).pathname;
            let parts = pathname.split("/").filter(Boolean);
            let folder = parts[parts.length - 1];

            // Fetch info.json for this folder, with error handling
            let infoRes = await fetch(`/songs/${folder}/info.json`);
            if (!infoRes.ok) {
                continue;
            }
            let info = await infoRes.json();

            // Append album card
            cardContainer.innerHTML += `
        <div data-folder="${folder}" class="card">
          <div class="play">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M5 20V4L19 12L5 20Z" fill="#000" stroke="#141B34" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
          <img src="/songs/${folder}/cover.jpg" alt="">
          <h2>${info.title || ""}</h2>
          <p>${info.description || ""}</p>
        </div>
      `;
        }
    }

    // Add click event for each card
    Array.from(document.getElementsByClassName("card")).forEach(card => {
        card.addEventListener("click", async () => {
            let newSongs = await getSongs(`songs/${card.dataset.folder}`);
            if (newSongs.length > 0) {
                playMusic(newSongs[0]);
            }
        });
    });
}

// Main Initialization
async function main() {
    // NEW: Await getSongs so songs array is ready before using it
    const loadedSongs = await getSongs(`songs/ncs`);
    if (loadedSongs.length > 0) {
        playMusic(loadedSongs[0], true);
    }
    await displayAlbums();

    // Player controls
    playBtn.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            playBtn.src = "img/pause.svg";
        } else {
            currentSong.pause();
            playBtn.src = "img/play.svg";
        }
    });

    prevBtn.addEventListener("click", () => {
        const currentTrack = decodeURIComponent(currentSong.src.split("/").pop());
        const index = songs.findIndex(song => song === currentTrack);
        if (index > 0) playMusic(songs[index - 1]);
    });

    nextBtn.addEventListener("click", () => {
        const currentTrack = decodeURIComponent(currentSong.src.split("/").pop());
        const index = songs.findIndex(song => song === currentTrack);
        if (index !== -1 && index < songs.length - 1) playMusic(songs[index + 1]);
    });


    // Time updates
    currentSong.addEventListener("timeupdate", () => {
        songTime.innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        circle.style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Seekbar
    seekbar.addEventListener("click", e => {
        let percent = (e.offsetX / seekbar.getBoundingClientRect().width) * 100;
        circle.style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    // Menu
    hamburger.addEventListener("click", () => leftMenu.style.left = "0");
    closeBtn.addEventListener("click", () => leftMenu.style.left = "-120%");

    // Volume
    volumeRange.addEventListener("input", e => {
        currentSong.volume = e.target.value / 100;
        volumeIcon.src = currentSong.volume > 0 ? "img/volume.svg" : "img/mute.svg";
    });

    volumeIcon.addEventListener("click", () => {
        if (volumeIcon.src.includes("volume.svg")) {
            volumeIcon.src = "img/mute.svg";
            currentSong.volume = 0;
            volumeRange.value = 0;
        } else {
            volumeIcon.src = "img/volume.svg";
            currentSong.volume = 0.1;
            volumeRange.value = 10;
        }
    });
}

// Start app
main();
