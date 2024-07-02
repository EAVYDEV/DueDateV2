let quickbase;
let currentLink = '';
let historyStack = [];
let historyIndex = -1;
let activeCard = null;

function handleClientLoad() {
  console.log('Loading Quickbase client...');
  toggleLoadingSpinner(true);
  if (!window.api || !window.api.initializeQuickBase) {
    console.error('window.api or window.api.initializeQuickBase is not defined.');
    toggleLoadingSpinner(false);
    return;
  }

  const qbToken = localStorage.getItem('qbToken');
  console.log('Loaded Quickbase token:', qbToken);  // Debug statement
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
    if (!quickbase || typeof quickbase.api !== 'function') {
      throw new Error('Quickbase client is not properly initialized.');
    }

    const response = await quickbase.api('API_DoQuery', {
      dbid: 'bfirp7cdp', // Replace with your table ID
      query: "{3.EX.'Value'}", // Adjust the query criteria as needed
      clist: "41.794.746.748.723.378", // List of your field IDs
      options: {
        fmt: 'structured' // Format the response in a structured format
      }
    });

    console.log('Quickbase data loaded:', response);
    displaySheetData(response.data);
  } catch (error) {
    console.error('Error loading Quickbase data:', error);
    handleError('Failed to fetch data from Quickbase', error);
  } finally {
    toggleLoadingSpinner(false);
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
  const [orderNumber, orderName, fabDue, zone, scope, am] = row;
  const fabDueDate = parseDate(fabDue);
  const isPastDue = fabDueDate && fabDueDate < currentDate;
  const card = document.createElement('div');
  card.className = `project-card ${isPastDue ? 'red' : 'orange'}`;
  if (fabDueDate) card.setAttribute('data-date', fabDueDate.toISOString().split('T')[0]);
  card.innerHTML = generateCardHTML(orderNumber, orderName, fabDue, zone, scope, am);
  return { card };
}

function generateCardHTML(orderNumber, orderName, fabDue, zone, scope, am) {
  return `
    <div class="order-info">${orderNumber} - ${orderName}</div>
    <div><b>Fab Due:</b> ${fabDue}</div>
    <div><b>Zone:</b> ${zone}</div>
    <div><b>Scope:</b> ${scope}</div>
    <div><b>AM:</b> ${am}</div>
  `;
}

function parseDate(dateString) {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function sortProjectCards(a, b) {
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

function toggleSettings() {
  const settingsIframe = document.getElementById('settings-iframe');
  const mainContent = document.getElementById('main-content');
  
  if (settingsIframe.classList.contains('hidden')) {
    console.log('Opening settings page...');
    settingsIframe.src = 'settings.html';
    settingsIframe.onload = () => {
      console.log('Settings page loaded.');
      const iframeDoc = settingsIframe.contentDocument || settingsIframe.contentWindow.document;
      const savedUrl = localStorage.getItem('qcUrl');
      const savedToken = localStorage.getItem('qbToken');
      if (savedUrl) {
        iframeDoc.getElementById('qc-url-input').value = savedUrl;
      }
      if (savedToken) {
        iframeDoc.getElementById('qb-token-input').value = savedToken;
      }
    };
    mainContent.style.display = 'none';
    settingsIframe.classList.remove('hidden');
  } else {
    console.log('Closing settings page...');
    settingsIframe.classList.add('hidden');
    mainContent.style.display = 'block';
  }
}

function saveSettings(qcUrl, qbToken) {
  console.log('Saving settings in parent:', { qcUrl, qbToken });  // Debug statement
  if (isValidUrl(qcUrl)) {
    localStorage.setItem('qcUrl', qcUrl);
    console.log('QC URL saved to local storage:', qcUrl);  // Debug statement
  } else {
    alert('Please enter a valid URL.');
    return;
  }
  if (qbToken) {
    localStorage.setItem('qbToken', qbToken);
    quickbase = window.api.initializeQuickBase(qbToken);
    console.log('Quickbase token saved to local storage:', qbToken);  // Debug statement
  } else {
    alert('Please enter a valid Quickbase token.');
    return;
  }
  alert('Settings saved.');
  returnToMain();
}

function returnToMain() {
  console.log('Returning to main page...');
  const settingsIframe = document.getElementById('settings-iframe');
  settingsIframe.classList.add('hidden');
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

window.addEventListener('message', (event) => {
  const { action, qcUrl, qbToken } = event.data;
  console.log('Received message:', { action, qcUrl, qbToken });  // Debug statement
  if (action === 'saveSettings') {
    saveSettings(qcUrl, qbToken);
  } else if (action === 'returnToMain') {
    returnToMain();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('Document loaded.');
  handleClientLoad();
  addTouchSupport();
  document.getElementById('search-input').addEventListener('input', filterProjects);
});

// Ensure toggleSettings is globally accessible
window.toggleSettings = toggleSettings;

function loadSheetData() {
  console.log('Loading sheet data...');
  loadQuickbaseData();
}
