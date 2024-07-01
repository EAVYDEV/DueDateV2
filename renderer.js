let quickbase;
let currentLink = '';
let historyStack = [];
let historyIndex = -1;
let activeCard = null;

function handleClientLoad() {
  console.log('Loading Quickbase client...');
  toggleLoadingSpinner(true);
  const qbToken = localStorage.getItem('qbToken');
  if (qbToken) {
    quickbase = window.api.initializeQuickBase(qbToken);
    loadQuickbaseData();
  } else {
    handleError('Quickbase token not found. Please set it in the settings.');
    toggleLoadingSpinner(false);
  }
}

async function loadQuickbaseData() {
  console.log('Loading Quickbase data...');
  toggleLoadingSpinner(true);
  try {
    const response = await quickbase.api('API_DoQuery', {
      dbid: 'bfirp7cdp', // Replace with your table ID
      query: "{3.EX.'Value'}", // Replace with your query criteria
      clist: "3.6.7.8.9.10.11.12.13", // Replace with your field IDs
      options: {
        fmt: 'structured'
      }
    });

    displaySheetData(response.data);
  } catch (error) {
    handleError('Failed to fetch data from Quickbase', error);
  }
}

function displaySheetData(data) {
  toggleLoadingSpinner(false);
  const projectList = document.getElementById('project-list');
  const currentDate = new Date();
  projectList.innerHTML = '';

  if (!data || data.length === 0) {
    projectList.innerHTML = '<p>No data found in the Quickbase report.</p>';
    return;
  }

  const projectCards = data.map(row => createProjectCard(row, currentDate));
  projectCards.sort((a, b) => sortProjectCards(a, b));
  projectCards.forEach(card => projectList.appendChild(card.card));
  initializeSortable(projectList);
}

function createProjectCard(row, currentDate) {
  const [orderNumber, name, fabDue, zone, scope, am, qcNotes, link, drawingsLink, qcReady] = row;
  const fabDueDate = parseDate(fabDue);
  const isPastDue = fabDueDate && fabDueDate < currentDate;
  const card = document.createElement('div');
  card.className = `project-card ${isPastDue ? 'red' : 'orange'}`;
  if (fabDueDate) card.setAttribute('data-date', fabDueDate.toISOString().split('T')[0]);
  if (qcReady && qcReady.toLowerCase() === 'yes') card.style.border = '10px solid rgba(255, 0, 0, 0.75)';
  card.innerHTML = generateCardHTML(orderNumber, name, fabDue, zone, scope, am, qcNotes, link, drawingsLink, qcReady);
  if (isValidUrl(link)) card.addEventListener('click', () => openLink(link, card));
  return { card, qcReady };
}

function parseDate(dateString) {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function generateCardHTML(orderNumber, name, fabDue, zone, scope, am, qcNotes, link, drawingsLink, qcReady) {
  return `
    <div class="order-info">${orderNumber} - ${name}</div>
    <div><b>Fab Due:</b> ${fabDue}</div>
    <div><b>Zone:</b> ${zone}</div>
    <div><b>Scope:</b> ${scope}</div>
    <div><b>AM:</b> ${am}</div>
    ${qcReady && qcReady.toLowerCase() === 'yes' ? `<div><b>QC Notes:</b> ${qcNotes}</div>` : ''}
    ${isValidUrl(drawingsLink) ? `<div><a href="#" onclick="openLink('${drawingsLink}'); return false;">View Drawings</a></div>` : ''}
  `;
}

function sortProjectCards(a, b) {
  if (a.qcReady && a.qcReady.toLowerCase() === 'yes' && (!b.qcReady || b.qcReady.toLowerCase() !== 'yes')) return -1;
  if (b.qcReady && b.qcReady.toLowerCase() === 'yes' && (!a.qcReady || a.qcReady.toLowerCase() !== 'yes')) return 1;
  return new Date(a.card.getAttribute('data-date')) - new Date(b.card.getAttribute('data-date'));
}

function initializeSortable(projectList) {
  Sortable.create(projectList, {
    animation: 150,
    ghostClass: 'blue-background-class'
  });
}

function openLink(link, card) {
  if (isValidUrl(link)) {
    currentLink = link;
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(link);
    historyIndex++;
    document.getElementById('iframe-container').innerHTML = `<iframe src="${link}"></iframe>`;

    // Highlight the active card
    if (activeCard) {
      activeCard.classList.remove('active');
    }
    activeCard = card;
    activeCard.classList.add('active');
  } else {
    alert('Invalid URL. Please enter a valid URL in the settings.');
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

function goBack() {
  if (historyIndex > 0) {
    historyIndex--;
    document.getElementById('iframe-container').innerHTML = `<iframe src="${historyStack[historyIndex]}"></iframe>`;
  }
}

function goForward() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    document.getElementById('iframe-container').innerHTML = `<iframe src="${historyStack[historyIndex]}"></iframe>`;
  }
}

function reloadPage() {
  document.getElementById('iframe-container').innerHTML = `<iframe src="${currentLink}"></iframe>`;
}

function goHome() {
  if (historyStack.length > 0) {
    historyIndex = 0;
    document.getElementById('iframe-container').innerHTML = `<iframe src="${historyStack[0]}"></iframe>`;
  }
}

function filterProjects() {
  const searchInput = document.getElementById('search-input').value.toLowerCase();
  const projectCards = document.getElementsByClassName('project-card');

  Array.from(projectCards).forEach(card => {
    const orderInfo = card.querySelector('.order-info').innerText.toLowerCase();
    card.style.display = orderInfo.includes(searchInput) ? '' : 'none';
  });
}

function addTouchSupport() {
  const hammer = new Hammer(document.body);
  hammer.on('swipeleft', goBack);
  hammer.on('swiperight', goForward);

  const projectCards = document.getElementsByClassName('project-card');
  Array.from(projectCards).forEach(card => {
    card.addEventListener('touchstart', handleTouchStart, false);
    card.addEventListener('touchend', handleTouchEnd, false);
  });
}

let touchStartX = null;
function handleTouchStart(evt) {
  const firstTouch = evt.touches[0];
  touchStartX = firstTouch.clientX;
}

function handleTouchEnd(evt) {
  if (!touchStartX) {
    return;
  }

  const touchEndX = evt.changedTouches[0].clientX;
  const touchDiff = touchStartX - touchEndX;

  if (Math.abs(touchDiff) > 50) {
    if (touchDiff > 0) {
      goBack();
    } else {
      goForward();
    }
  }
  touchStartX = null;
}

function goToSettings() {
  console.log('Opening settings page...');
  fetch('settings.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('settings-content').innerHTML = data;
      document.getElementById('main-content').style.display = 'none';
      document.getElementById('settings-content').style.display = 'block';

      const savedUrl = localStorage.getItem('qcUrl');
      const savedToken = localStorage.getItem('qbToken');
      if (savedUrl) {
        document.getElementById('qc-url-input').value = savedUrl;
      }
      if (savedToken) {
        document.getElementById('qb-token-input').value = savedToken;
      }
    });
}

function saveSettings() {
  const qcUrlInput = document.getElementById('qc-url-input').value;
  const qbTokenInput = document.getElementById('qb-token-input').value;
  if (isValidUrl(qcUrlInput)) {
    localStorage.setItem('qcUrl', qcUrlInput);
  } else {
    alert('Please enter a valid URL.');
    return;
  }
  if (qbTokenInput) {
    localStorage.setItem('qbToken', qbTokenInput);
    quickbase = window.api.initializeQuickBase(qbTokenInput);
  } else {
    alert('Please enter a valid Quickbase token.');
    return;
  }
  alert('Settings saved.');
  returnToMain();
}

function returnToMain() {
  console.log('Returning to main page...');
  document.getElementById('settings-content').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
}

function goToAddQC() {
  const qcUrl = localStorage.getItem('qcUrl');
  if (qcUrl && isValidUrl(qcUrl)) {
    openLink(qcUrl);
  } else {
    alert('Please set a valid QC URL in the settings.');
  }
}

function toggleLoadingSpinner(show) {
  document.getElementById('loading-spinner').style.display = show ? 'block' : 'none';
}

function handleError(message, error) {
  console.error(message, error);
  alert(`${message}. Please check the console for more details.`);
  toggleLoadingSpinner(false);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Document loaded.');
  handleClientLoad();
  addTouchSupport();
  document.getElementById('search-input').addEventListener('input', filterProjects);
});
