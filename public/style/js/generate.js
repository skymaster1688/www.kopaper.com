// koPaper Generate Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  const keywordInput = document.getElementById('keywordInput');
  const difficulty = document.getElementById('difficulty');
  const style = document.getElementById('style');
  const type = document.getElementById('type');
  const generateBtn = document.getElementById('generateBtn');
  const generateImageBtn = document.getElementById('generateImageBtn');
  const retryBtn = document.getElementById('retryBtn');
  const copyBtn = document.getElementById('copyBtn');
  const shareBtn = document.getElementById('shareBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  
  const placeholder = document.getElementById('placeholder');
  const resultContent = document.getElementById('resultContent');
  const resultLoading = document.getElementById('resultLoading');
  const resultError = document.getElementById('resultError');
  const loader = document.getElementById('loader');
  
  let currentResult = null;
  
  // Check URL params
  const urlParams = new URLSearchParams(window.location.search);
  const qParam = urlParams.get('q');
  if (qParam) {
    keywordInput.value = qParam.replace(/\+/g, ' ');
    if (qParam.includes('origami')) {
      type.value = 'origami';
    } else if (qParam.includes('letter') || qParam.includes('paper')) {
      type.value = 'letter-paper';
    }
  }
  
  // Quick chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      keywordInput.value = this.dataset.q;
    });
  });
  
  // Generate button
  generateBtn.addEventListener('click', generatePaperCraft);
  
  // Generate image button
  generateImageBtn.addEventListener('click', generateImage);
  
  // Retry button
  retryBtn.addEventListener('click', generatePaperCraft);
  
  // Copy button
  copyBtn.addEventListener('click', copyInstructions);
  
  // Share button
  shareBtn.addEventListener('click', shareResult);
  
  // Download PDF button
  downloadPdfBtn.addEventListener('click', downloadPDF);
  
  // Enter key to generate
  keywordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      generatePaperCraft();
    }
  });
  
  // Load history
  loadHistory();
  
  async function generatePaperCraft() {
    const keyword = keywordInput.value.trim();
    
    if (!keyword) {
      showToast('Please enter a keyword', 'error');
      keywordInput.focus();
      return;
    }
    
    // Show loading
    placeholder.style.display = 'none';
    resultContent.style.display = 'none';
    resultError.style.display = 'none';
    resultLoading.style.display = 'block';
    generateBtn.disabled = true;
    loader.style.display = 'inline-block';
    
    try {
      const response = await fetch('https://humanize-api.1628582080.workers.dev/api/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: keyword,
          difficulty: difficulty.value,
          style: style.value,
          type: type.value
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate');
      }
      
      currentResult = data.data;
      displayResult(currentResult);
      addToHistory(keyword);
      
    } catch (error) {
      showError(error.message);
    } finally {
      resultLoading.style.display = 'none';
      generateBtn.disabled = false;
      loader.style.display = 'none';
    }
  }
  
  function displayResult(data) {
    document.getElementById('resultTitle').textContent = data.title || 'Paper Craft';
    document.getElementById('badgeDifficulty').textContent = capitalize(data.difficulty);
    document.getElementById('badgeStyle').textContent = capitalize(data.style);
    document.getElementById('badgeType').textContent = capitalize(data.type);
    
    // Materials
    const materialsList = document.getElementById('materialsList');
    materialsList.innerHTML = '';
    if (data.materials && data.materials.length > 0) {
      data.materials.forEach(material => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-check-circle"></i> ${material}`;
        materialsList.appendChild(li);
      });
    }
    
    // Steps
    const stepsList = document.getElementById('stepsList');
    stepsList.innerHTML = '';
    if (data.steps && data.steps.length > 0) {
      data.steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item';
        stepDiv.innerHTML = `
          <div class="step-number">${index + 1}</div>
          <div class="step-content">
            <p>${step.text}</p>
            ${step.tip ? `<p class="step-tip"><i class="fas fa-lightbulb"></i> ${step.tip}</p>` : ''}
          </div>
        `;
        stepsList.appendChild(stepDiv);
      });
    }
    
    // Tips
    const tipsList = document.getElementById('tipsList');
    tipsList.innerHTML = '';
    if (data.tips && data.tips.length > 0) {
      data.tips.forEach(tip => {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-star"></i> ${tip}`;
        tipsList.appendChild(li);
      });
    }
    
    resultContent.style.display = 'block';
    showToast('Paper craft generated successfully!', 'success');
  }
  
  async function generateImage() {
    if (!currentResult) return;
    
    const imageContainer = document.querySelector('.image-placeholder');
    const originalContent = imageContainer.innerHTML;
    
    imageContainer.innerHTML = '<div class="loading-spinner"></div><p>Generating image...</p>';
    
    try {
      const response = await fetch('https://humanize-api.1628582080.workers.dev/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: currentResult.title,
          type: type.value
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        imageContainer.innerHTML = `
          <img src="${data.data.imageUrl}" alt="${currentResult.title}" />
        `;
        showToast('Image generated!', 'success');
      } else {
        throw new Error(data.error || 'Failed to generate image');
      }
    } catch (error) {
      imageContainer.innerHTML = originalContent;
      showToast(error.message, 'error');
    }
  }
  
  function copyInstructions() {
    if (!currentResult) return;
    
    let text = `${currentResult.title}\n\n`;
    text += `Difficulty: ${currentResult.difficulty} | Style: ${currentResult.style} | Type: ${currentResult.type}\n\n`;
    text += `Materials:\n`;
    currentResult.materials.forEach(m => text += `- ${m}\n`);
    text += `\nSteps:\n`;
    currentResult.steps.forEach((s, i) => text += `${i + 1}. ${s.text}\n`);
    if (currentResult.tips && currentResult.tips.length > 0) {
      text += `\nTips:\n`;
      currentResult.tips.forEach(t => text += `- ${t}\n`);
    }
    
    navigator.clipboard.writeText(text).then(() => {
      showToast('Instructions copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  }
  
  function shareResult() {
    const url = window.location.origin + '/generate/?q=' + encodeURIComponent(keywordInput.value.replace(/\s+/g, '+'));
    
    if (navigator.share) {
      navigator.share({
        title: 'koPaper - ' + currentResult.title,
        text: 'Check out this paper craft: ' + currentResult.title,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!', 'success');
      });
    }
  }
  
  function downloadPDF() {
    if (!currentResult) return;
    
    showToast('PDF download coming soon!', 'success');
  }
  
  function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    resultError.style.display = 'block';
  }
  
  function addToHistory(keyword) {
    let history = JSON.parse(localStorage.getItem('paperCraftHistory') || '[]');
    history = history.filter(item => item !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 10);
    localStorage.setItem('paperCraftHistory', JSON.stringify(history));
    loadHistory();
  }
  
  function loadHistory() {
    const historyList = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('paperCraftHistory') || '[]');
    
    if (history.length === 0) {
      historyList.innerHTML = '<p class="no-history">No recent generations</p>';
      return;
    }
    
    historyList.innerHTML = '';
    history.forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `<a href="/generate/?q=${encodeURIComponent(item.replace(/\s+/g, '+'))}">${item}</a>`;
      historyList.appendChild(div);
    });
  }
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toast.className = 'toast ' + type;
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
  
  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mainNav = document.getElementById('mainNav');
  
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
      mainNav.classList.toggle('active');
    });
  }
});
