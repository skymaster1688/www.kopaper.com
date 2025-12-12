// Home Page JavaScript
    // DOM Elements
    const textarea = document.getElementById('aiText');
    const humanizedTextarea = document.getElementById('humanizedText');
    const wordCountSpan = document.getElementById('wordCount');
    const outputWordCountSpan = document.getElementById('outputWordCount');
    const convertBtn = document.getElementById('convertBtn');
    const loader = document.getElementById('loader');
    const clearInputBtn = document.getElementById('clearInputBtn');
    const pasteInputBtn = document.getElementById('pasteInputBtn');
    const copyOutputBtn = document.getElementById('copyOutputBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const writingStyleSelect = document.getElementById('writingStyle');
    
    // Character limit configuration
    const MAX_TEXT_LENGTH = 600; // Maximum 600 characters per use
    
    // FAQ Elements
    const faqQuestions = document.querySelectorAll('.faq-question');


    // Enhanced word count function for different languages
    function calculateWordCount(text) {
      if (!text) return 0;
      
      // Remove whitespace and normalize
      const cleanedText = text.trim();
      if (cleanedText === '') return 0;
      
      let totalWords = 0;
      const MAX_ENGLISH_WORD_LENGTH = 20; // Maximum length for a single English word
      
      // Check if text contains mainly Chinese/Japanese/Korean characters
      const hasCJKChars = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(cleanedText);
      
      if (hasCJKChars) {
        // For CJK languages: count each character as 1 word
        // Exclude whitespace and common punctuation
        totalWords = cleanedText.replace(/[\s\p{P}]/gu, '').length;
      } else {
        // For other languages (mainly English): count words
        const words = cleanedText.split(/\s+/).filter(word => word.length > 0);
        
        words.forEach(word => {
          // Remove punctuation from the word
          const wordWithoutPunc = word.replace(/[\p{P}]/gu, '');
          if (wordWithoutPunc.length === 0) return;
          
          // If word is longer than max allowed, calculate proportionally
          if (wordWithoutPunc.length > MAX_ENGLISH_WORD_LENGTH) {
            totalWords += Math.ceil(wordWithoutPunc.length / MAX_ENGLISH_WORD_LENGTH);
          } else {
            totalWords += 1;
          }
        });
      }
      
      return totalWords;
    }
    
    // Count input characters with enhanced rules
    textarea.addEventListener('input', () => {
      const wordCount = calculateWordCount(textarea.value);
      wordCountSpan.textContent = `${wordCount} / ${MAX_TEXT_LENGTH}`;
      
      // Apply visual feedback and disable button when limit exceeded
      if (wordCount > MAX_TEXT_LENGTH) {
        wordCountSpan.style.color = '#ef4444'; // Red color for over limit
        convertBtn.disabled = true;
        convertBtn.style.opacity = '0.5';
        convertBtn.style.cursor = 'not-allowed';
      } else {
        wordCountSpan.style.color = ''; // Reset to default color
        convertBtn.disabled = false;
        convertBtn.style.opacity = '';
        convertBtn.style.cursor = '';
      }
      
      // Clear output if input is empty
      if (wordCount === 0) {
        humanizedTextarea.value = '';
        outputWordCountSpan.textContent = '0';
        copyOutputBtn.disabled = true;
      }
    });

    // Update output character count with enhanced rules
    function updateOutputWordCount() {
      const wordCount = calculateWordCount(humanizedTextarea.value);
      outputWordCountSpan.textContent = wordCount;
      copyOutputBtn.disabled = wordCount === 0;
    }

    // Show toast notification
    function showToast(message, type = 'success') {
      toastMessage.textContent = message;
      toast.className = `toast ${type}`;
      toast.classList.add('show');
      
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    // Clear input textarea
    clearInputBtn.addEventListener('click', () => {
      textarea.value = '';
      wordCountSpan.textContent = '0 / ' + MAX_TEXT_LENGTH;
      humanizedTextarea.value = '';
      outputWordCountSpan.textContent = '0';
      copyOutputBtn.disabled = true;
    });

    // Paste from clipboard
    pasteInputBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        textarea.value = text;
        // Trigger input event to update word count with new rules
        textarea.dispatchEvent(new Event('input'));
        showToast('Text pasted successfully');
      } catch (err) {
        showToast('Failed to paste text', 'error');
        console.error('Failed to read clipboard:', err);
      }
    });

    // Copy output text to clipboard
    copyOutputBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(humanizedTextarea.value);
        showToast('Humanized text copied to clipboard');
      } catch (err) {
        showToast('Failed to copy text', 'error');
        console.error('Failed to write clipboard:', err);
      }
    });


    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      const icon = mobileMenuBtn.querySelector('i');
      if (mainNav.classList.contains('active')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    });

    // FAQ toggle functionality
    faqQuestions.forEach(question => {
      question.addEventListener('click', () => {
        const targetId = question.getAttribute('data-target');
        const answer = document.getElementById(targetId);
        const icon = document.getElementById(`faqIcon${targetId.replace('faq', '')}`);
        
        answer.classList.toggle('active');
        icon.classList.toggle('active');
      });
    });

    // Simulate AI text humanization process
    // In a production environment, this would call a backend API
    function humanizeText(aiText, style = 'default') {
      // Define style-specific replacement rules
      const styleRules = {
        default: [
          { from: 'AI', to: 'artificial intelligence' },
          { from: 'generated', to: 'created' },
          { from: 'text', to: 'content' },
          { from: 'will', to: 'will likely' },
          { from: 'can', to: 'is able to' },
          { from: 'make', to: 'create' },
          { from: 'use', to: 'utilize' },
          { from: 'help', to: 'assist' },
          { from: 'very', to: 'extremely' },
          { from: 'good', to: 'excellent' },
          { from: 'important', to: 'crucial' },
          { from: 'many', to: 'numerous' },
          { from: 'often', to: 'frequently' },
          { from: 'show', to: 'demonstrate' },
          { from: 'get', to: 'obtain' }
        ],
        simple: [
          { from: 'AI', to: 'computer' },
          { from: 'generated', to: 'made' },
          { from: 'utilize', to: 'use' },
          { from: 'implement', to: 'use' },
          { from: 'utilize', to: 'use' },
          { from: 'optimize', to: 'improve' },
          { from: 'facilitate', to: 'help' },
          { from: 'analyze', to: 'look at' },
          { from: 'synthesize', to: 'put together' },
          { from: 'methodology', to: 'way' },
          { from: 'paradigm', to: 'idea' },
          { from: 'framework', to: 'structure' }
        ],
        creative: [
          { from: 'AI', to: 'digital brain' },
          { from: 'generated', to: 'crafted' },
          { from: 'text', to: 'tale' },
          { from: 'write', to: 'weave' },
          { from: 'use', to: 'harness' },
          { from: 'make', to: 'forge' },
          { from: 'good', to: 'stunning' },
          { from: 'important', to: 'vital' },
          { from: 'many', to: 'countless' },
          { from: 'show', to: 'reveal' },
          { from: 'get', to: 'uncover' },
          { from: 'find', to: 'discover' }
        ],
        academic: [
          { from: 'AI', to: 'artificial intelligence systems' },
          { from: 'generated', to: 'produced' },
          { from: 'text', to: 'discourse' },
          { from: 'use', to: 'employ' },
          { from: 'make', to: 'construct' },
          { from: 'good', to: 'robust' },
          { from: 'important', to: 'significant' },
          { from: 'many', to: 'a plethora of' },
          { from: 'often', to: 'frequently' },
          { from: 'show', to: 'exhibit' },
          { from: 'get', to: 'attain' },
          { from: 'find', to: 'ascertain' },
          { from: 'see', to: 'observe' },
          { from: 'think', to: 'hypothesize' }
        ],
        casual: [
          { from: 'AI', to: 'AI' },
          { from: 'generated', to: 'made' },
          { from: 'text', to: 'stuff' },
          { from: 'utilize', to: 'use' },
          { from: 'implement', to: 'do' },
          { from: 'optimize', to: 'tweak' },
          { from: 'facilitate', to: 'make easier' },
          { from: 'analyze', to: 'check out' },
          { from: 'synthesize', to: 'put together' },
          { from: 'methodology', to: 'way' },
          { from: 'paradigm', to: 'idea' },
          { from: 'framework', to: 'plan' },
          { from: 'very', to: 'super' },
          { from: 'good', to: 'great' },
          { from: 'important', to: 'big deal' }
        ]
      };
      
      const replacements = styleRules[style] || styleRules.default;
      
      let humanized = aiText;
      
      // Replace certain words based on selected style
      replacements.forEach(replacement => {
        const regex = new RegExp(`\\b${replacement.from}\\b`, 'gi');
        humanized = humanized.replace(regex, replacement.to);
      });
      
      // Add natural transitions and sentence variation
      const transitions = ['In fact', 'Interestingly', 'As a matter of fact', 'Furthermore', 'Additionally', 'On the other hand'];
      const sentences = humanized.split(/(?<=[.!?])\s+/);
      
      // Randomly add transition words to some sentences
      const humanizedSentences = sentences.map((sentence, index) => {
        if (index > 0 && Math.random() > 0.7 && sentence.length > 20) {
          const transition = transitions[Math.floor(Math.random() * transitions.length)];
          return `${transition}, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`;
        }
        return sentence;
      });
      
      return humanizedSentences.join(' ');
    }

    // Call Cloudflare Workers API proxy for text humanization
    async function callGeminiAPI(text, style) {
      try {
        // Call our Cloudflare Workers proxy API
        const response = await fetch('https://humanize-api.1628582080.workers.dev/humanizeai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            style: style
          })
        });
        
        if (!response.ok) {
          // Handle API errors
          const errorData = await response.json().catch(() => ({
            error: `API request failed: ${response.statusText}`
          }));
          
          // Handle API errors
          if (response.status === 413) {
            showToast(errorData.error || 'Text too long, please shorten and try again!', 'error');
          } else {
            showToast(errorData.error || 'Processing failed, please try again later!', 'error');
          }
          
          throw new Error(errorData.error);
        }
        
        const data = await response.json();
        
        // Parse Gemini API response (forwarded through proxy)
        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && data.candidates[0].content.parts) {
          return data.candidates[0].content.parts[0].text;
        }
        
        throw new Error('API response format is incorrect');
      } catch (error) {
        console.error('API call error:', error);
        // If API call fails, fall back to local simulation conversion
        return humanizeText(text, style);
      }
    }

    // Handle conversion process when button is clicked
    convertBtn.addEventListener('click', async () => {
      // Validate input
      if (!textarea.value.trim()) {
        showToast('Please paste your AI-generated text first', 'error');
        textarea.focus();
        return;
      }
      
      // Check if input exceeds word count limit using enhanced rules
      const wordCount = calculateWordCount(textarea.value);
      if (wordCount > MAX_TEXT_LENGTH) {
        showToast(`Text too long (${wordCount} words), please shorten to ${MAX_TEXT_LENGTH} words or less`, 'error');
        return;
      }

      // Set loading state
      textarea.disabled = true;
      convertBtn.disabled = true;
      convertBtn.querySelector('i').style.display = 'none';
      convertBtn.querySelector('span').style.display = 'none';
      loader.style.display = 'inline-block';
      humanizedTextarea.value = 'Humanizing your text...';
      updateOutputWordCount();

      try {
        // Get selected writing style
        const selectedStyle = writingStyleSelect.value;
        // Call Gemini API for actual text humanization
        const humanized = await callGeminiAPI(textarea.value, selectedStyle);
        
        humanizedTextarea.value = humanized;
        updateOutputWordCount();
        
        // Show success message
        showToast('Text humanized successfully!');
      } catch (error) {
        console.error('Conversion error:', error);
        humanizedTextarea.value = 'An error occurred during text humanization. Please try again.';
        updateOutputWordCount();
        showToast('An error occurred. Please try again later.', 'error');
      } finally {
        // Reset state
        textarea.disabled = false;
        convertBtn.disabled = false;
        convertBtn.querySelector('i').style.display = 'inline-block';
        convertBtn.querySelector('span').style.display = 'inline-block';
        loader.style.display = 'none';
      }
    });

    // Initialize FAQ - open first item by default
    document.getElementById('faq1').classList.add('active');
    document.getElementById('faqIcon1').classList.add('active');
    
    // Add event listener for smooth scrolling on anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: 'smooth'
          });
          
          // Close mobile menu if open
          if (mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
          }
        }
      });
    });