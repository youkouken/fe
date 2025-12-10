import { questionData } from './questions.js';
import { labels } from './labels.js';

let sessionDeck = []; 
let currentCard = null;
let sessionDebt = {}; 
let masteredIds = JSON.parse(localStorage.getItem('fe_mastered')) || [];
let bookmarkedIds = JSON.parse(localStorage.getItem('fe_bookmarked')) || [];
let selectedCategory = null; 

function init() { 
    // 讀取主題
    const savedTheme = localStorage.getItem('fe_theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }

    initLabels(); 
    
    if(questionData.length === 0) showPopup("Error: No Data");
    
    // 直接渲染大廳，不需要等待登入
    renderLobby();
}

function initLabels() {
    document.title = labels.appTitle;
    document.getElementById('lbl-app-title').innerText = labels.appTitle;
    
    // 彈窗文字
    document.getElementById('lbl-mode-title').innerText = labels.messages.selectModeTitle;
    document.getElementById('btn-mode-10').innerText = labels.buttons.mode10;
    document.getElementById('btn-mode-20').innerText = labels.buttons.mode20;
    document.getElementById('btn-mode-30').innerText = labels.buttons.mode30;
    document.getElementById('btn-mode-all').innerText = labels.buttons.modeAll;
    document.getElementById('lbl-cancel').innerText = labels.buttons.cancel;
    document.getElementById('btn-msg-ok').innerText = labels.buttons.ok;

    // 學習介面
    document.getElementById('lbl-remain').innerText = labels.status.remaining;
    document.getElementById('lbl-tap').innerText = labels.status.tapToFlip;
    document.getElementById('btn-reset').innerText = labels.buttons.reset;
    document.getElementById('lbl-list-title').innerText = labels.messages.masteredListTitle;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'flex';
}

function renderLobby() {
    const listEl = document.getElementById('chapter-list');
    listEl.innerHTML = "";
    const categories = [...new Set(questionData.map(item => item.cat))];

    categories.forEach(cat => {
        const itemsInCat = questionData.filter(i => i.cat === cat);
        const remaining = itemsInCat.filter(i => !masteredIds.includes(i.id)).length;
        const statusText = remaining === 0 ? labels.status.allClear : labels.status.remainingCount.replace('{n}', remaining);

        const div = document.createElement('div');
        div.className = 'chapter-card';
        div.onclick = () => openModeModal(cat);
        div.innerHTML = `
            <div>
                <div style="font-weight:700; font-size:1.1rem; margin-bottom:5px;">${cat}</div>
                <span class="tag-pill">${statusText}</span>
            </div>
            <div style="font-size:1.2rem;">▶</div>
        `;
        listEl.appendChild(div);
    });
    document.getElementById('bookmark-count').innerText = bookmarkedIds.length;
    document.getElementById('mastered-count').innerText = masteredIds.length;
}

// 綁定 Window 函數
window.toggleTheme = () => {
    const currentTheme = document.body.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('fe_theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('fe_theme', 'dark');
    }
};

window.openModeModal = (category) => {
    selectedCategory = category;
    const pool = questionData.filter(item => item.cat === category && !masteredIds.includes(item.id));
    if (pool.length === 0) {
        if(confirm(labels.messages.chapterComplete)) document.getElementById('mode-modal').style.display = 'flex';
    } else {
        document.getElementById('mode-modal').style.display = 'flex';
    }
};

window.closeModal = () => { document.getElementById('mode-modal').style.display = 'none'; selectedCategory = null; };

window.confirmStart = (count) => {
    let pool = questionData.filter(item => item.cat === selectedCategory && !masteredIds.includes(item.id));
    if (pool.length === 0) pool = questionData.filter(item => item.cat === selectedCategory);
    window.closeModal();
    
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    sessionDeck = (count !== 'all') ? pool.slice(0, count) : pool;
    sessionDebt = {}; 
    showScreen('study-screen');
    pickRandomCard();
};

window.startBookmarkSession = () => {
    sessionDeck = questionData.filter(item => bookmarkedIds.includes(item.id));
    if (sessionDeck.length === 0) { showPopup(labels.status.emptyBookmark); return; }
    sessionDebt = {};
    showScreen('study-screen');
    pickRandomCard();
};

window.showMasteredScreen = () => {
    const list = document.getElementById('mastered-list');
    list.innerHTML = "";
    const masteredItems = questionData.filter(item => masteredIds.includes(item.id));
    if(masteredItems.length === 0) {
        list.innerHTML = `<div style='text-align:center; padding:20px; opacity:0.5;'>${labels.status.emptyMastered}</div>`;
    } else {
        masteredItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `<div><div style="font-weight:bold;">${item.zh}</div><div style="font-size:0.8rem; opacity:0.7;">${item.ja}</div></div><button class="list-btn" onclick="unMaster(${item.id})">${labels.buttons.forget}</button>`;
            list.appendChild(div);
        });
    }
    showScreen('mastered-screen');
};

window.goBackToLobby = () => { showScreen('lobby-screen'); renderLobby(); };
window.flipCard = () => { document.getElementById('flashcard').classList.toggle('flipped'); };

window.handleBlurry = () => {
    const id = currentCard.id;
    sessionDebt[id] = (sessionDebt[id] || 0) + 1;
    showPopup(labels.messages.markFuzzy.replace('{n}', sessionDebt[id]));
    pickRandomCard();
};

window.handleKnow = () => {
    const id = currentCard.id;
    if (sessionDebt[id] > 0) {
        sessionDebt[id]--;
        const msg = sessionDebt[id] === 0 ? labels.messages.markClear : labels.messages.keepGoing.replace('{n}', sessionDebt[id]);
        showPopup(msg);
        if(sessionDebt[id] === 0) sessionDeck = sessionDeck.filter(c => c.id !== id);
    } else {
        sessionDeck = sessionDeck.filter(c => c.id !== id);
        showPopup(labels.messages.pass);
    }
    pickRandomCard();
};

window.handleMastered = () => {
    if (!masteredIds.includes(currentCard.id)) {
        masteredIds.push(currentCard.id);
        saveData();
    }
    sessionDeck = sessionDeck.filter(c => c.id !== currentCard.id);
    showPopup(labels.messages.addedMaster);
    pickRandomCard();
};

window.toggleBookmark = (e) => {
    e.stopPropagation();
    const id = currentCard.id;
    if (bookmarkedIds.includes(id)) {
        bookmarkedIds = bookmarkedIds.filter(bid => bid !== id);
        showPopup(labels.messages.removedBookmark);
    } else {
        bookmarkedIds.push(id);
        showPopup(labels.messages.addedBookmark);
    }
    saveData();
    updateCardUI();
};

window.unMaster = (id) => {
    if(confirm(labels.messages.confirmUnMaster)) {
        masteredIds = masteredIds.filter(mid => mid !== id);
        saveData();
        showMasteredScreen();
        showPopup(labels.messages.movedBack);
    }
};

window.resetProgress = () => {
    if(confirm(labels.messages.confirmReset)) {
        masteredIds = []; bookmarkedIds = [];
        saveData();
        location.reload();
    }
};

window.showPopup = (msg) => {
    const modal = document.getElementById('msg-modal');
    document.getElementById('msg-content').innerText = msg;
    modal.style.display = 'flex';
};
window.closePopup = () => { document.getElementById('msg-modal').style.display = 'none'; };

function pickRandomCard() {
    if (sessionDeck.length === 0) { showPopup(labels.messages.complete); goBackToLobby(); return; }
    let nextIndex = 0;
    if (sessionDeck.length > 1 && currentCard) {
        do { nextIndex = Math.floor(Math.random() * sessionDeck.length); } while (sessionDeck[nextIndex].id === currentCard.id);
    }
    currentCard = sessionDeck[nextIndex];
    updateCardUI();
}

function updateCardUI() {
    const cardEl = document.getElementById('flashcard');
    cardEl.classList.remove('flipped');
    document.getElementById('remain-count').innerText = sessionDeck.length;

    setTimeout(() => {
        document.getElementById('term-zh').innerText = currentCard.zh;
        document.getElementById('term-ja').innerText = currentCard.ja;
        document.getElementById('term-yomi').innerText = currentCard.yomi || '';
        document.getElementById('term-yomi').style.display = currentCard.yomi ? 'block' : 'none';
        document.getElementById('term-eng').innerText = currentCard.eng || '';
        document.getElementById('term-eng').style.display = currentCard.eng ? 'inline-block' : 'none';
        document.getElementById('desc-zh').innerText = currentCard.desc_zh;
        document.getElementById('desc-ja').innerText = currentCard.desc_ja;

        const star = document.getElementById('bookmark-icon');
        star.className = bookmarkedIds.includes(currentCard.id) ? 'card-icon active' : 'card-icon';
        
        const debt = sessionDebt[currentCard.id] || 0;
        const badge = document.getElementById('debt-badge');
        badge.style.display = debt > 0 ? 'block' : 'none';
    }, 200);
}

function saveData() {
    localStorage.setItem('fe_mastered', JSON.stringify(masteredIds));
    localStorage.setItem('fe_bookmarked', JSON.stringify(bookmarkedIds));
    renderLobby();
}

init();