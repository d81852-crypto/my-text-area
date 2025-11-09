document.addEventListener('DOMContentLoaded', function() {
    
    // --- הגדרת משתנים גלובליים ---
    const contentArea = document.getElementById('content-area');
    const tocList = document.getElementById('toc-list');
    const searchBox = document.getElementById('search-box');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const partButtons = document.querySelectorAll('.part-button');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarSubtitle = document.getElementById('sidebar-subtitle');
    const expandAllBtn = document.getElementById('toc-expand-all');
    const collapseAllBtn = document.getElementById('toc-collapse-all');
    
    const highlightNav = document.getElementById('highlight-nav');
    const prevHighlightBtn = document.getElementById('prev-highlight');
    const nextHighlightBtn = document.getElementById('next-highlight');
    const highlightCounter = document.getElementById('highlight-counter');

    const backToTopBtn = document.getElementById('back-to-top-btn');
    const darkModeBtn = document.getElementById('dark-mode-btn');
    const fontIncreaseBtn = document.getElementById('font-increase');
    const fontDecreaseBtn = document.getElementById('font-decrease');
    
    const headerSearchSummary = document.getElementById('header-search-summary');
    
    // === שדרוג: איתור הכותרת החדשה ===
    const globalSearchTitle = document.getElementById('global-search-title');
    
    let headingCounter = 0;
    let searchIndex = [];
    let currentActivePart = 'part1.html';
    let isSearchMode = false;
    let allHighlights = []; 
    let currentHighlightIndex = 0;
    let currentFontSize = 1.2;

    // --- 1. טעינת "המוח" (אינדקס החיפוש) ---
    async function loadSearchIndex() {
        try {
            const response = await fetch('search-index.json?v=' + new Date().getTime());
            if (!response.ok) {
                throw new Error('Failed to load search index');
            }
            searchIndex = await response.json();
            console.log(`אינדקס המאמרים נטען בהצלחה. ${searchIndex.length} מאמרים.`);
        } catch (error) {
            console.error('שגיאה קריטית בטעינת אינדקס המאמרים:', error);
            sidebarSubtitle.textContent = 'שגיאה בטעינת החיפוש';
        }
    }

    // --- 2. טעינת תוכן (קובץ שנה) ---
    async function loadContent(fileName, searchTerm = null, targetHeading = null) {
        contentArea.innerHTML = '<h2>טוען תוכן...</h2>';
        if (!searchTerm) {
            tocList.innerHTML = '<li>טוען...</li>';
        }
        
        headingCounter = 0;
        
        try {
            const response = await fetch(fileName);
            if (!response.ok) throw new Error('File Not Found');
            
            const htmlContent = await response.text();
            contentArea.innerHTML = htmlContent;
            
            addVisualSeparators(); 
            
            if (!searchTerm) {
                buildTableOfContents(); // בניית ניווט רגיל
                hideHighlightNav(); // הסתר ניווט מופעים
            } else {
                highlightSearchTerm(searchTerm);
                const targetArticleElement = findHeadingElement(targetHeading);
                scrollToElement(targetArticleElement);
                setupHighlightNavigation(targetArticleElement);
            }

        } catch (error) {
            console.error('שגיאה בטעינת התוכן:', error);
            contentArea.innerHTML = '<h2>שגיאה:</h2><p>לא ניתן היה לטעון את הקובץ.</p>';
            hideHighlightNav();
        }
    }

    // --- 3. מנוע החיפוש הגלובלי ---
    function performSearch(query) {
        const queryLength = query.length;

        if (queryLength < 2) {
            if (isSearchMode && queryLength === 0) {
                resetToDefaultView();
            }
            return;
        }

        isSearchMode = true; 
        console.log(`מחפש: "${query}"...`);
        clearSearchBtn.style.display = 'block';
        hideNavControls();
        
        // === שדרוג: החלפת הכותרת בסיכום ===
        globalSearchTitle.style.display = 'none';

        const results = [];
        const yearsFound = new Set();
        let totalOccurrences = 0;
        const lowerCaseQuery = query.toLowerCase();
        const regex = new RegExp(lowerCaseQuery, 'g'); 
        
        searchIndex.forEach(article => {
            const textMatches = (article.text.match(regex) || []);
            const headingMatches = (article.heading.toLowerCase().match(regex) || []);
            const occurrencesInArticle = textMatches.length + headingMatches.length;

            if (occurrencesInArticle > 0) {
                totalOccurrences += occurrencesInArticle;
                yearsFound.add(article.year);
                results.push({ ...article, hits: occurrencesInArticle });
            }
        });
        
        const summaryText = `נמצאו ${totalOccurrences} מופעים ב-${results.length} מאמרים (${yearsFound.size} שנים)`;

        sidebarTitle.textContent = `חיפוש: '${query}'`;
        sidebarSubtitle.textContent = summaryText;
        sidebarSubtitle.className = 'search-summary';

        // הצגת הסיכום בסרגל העליון
        if (headerSearchSummary) {
            headerSearchSummary.textContent = summaryText;
            headerSearchSummary.style.display = 'block';
        }
        
        displaySearchResults(results, query);
    }
    
    // --- 4. הצגת תוצאות החיפוש בסרגל הצד ---
    function displaySearchResults(results, query) {
        tocList.innerHTML = '';
        if (results.length === 0) {
            tocList.innerHTML = '<li>לא נמצאו תוצאות.</li>';
            return;
        }

        results.forEach(result => {
            const li = document.createElement('li');
            li.className = 'search-result';
            
            li.innerHTML = `
                <span class="result-year">שנה: ${result.year}</span>
                <a href="#" class="result-link">${result.heading}</a>
                <span class="result-hits">(${result.hits} מופעים במאמר זה)</span>
            `;
            
            li.addEventListener('click', (e) => {
                e.preventDefault();
                updateActiveButton(result.file);
                loadContent(result.file, query, result.heading);
            });
            tocList.appendChild(li);
        });
    }

    // --- 5. ניקוי חיפוש וחזרה למצב רגיל ---
    function resetToDefaultView() {
        isSearchMode = false;
        searchBox.value = '';
        clearSearchBtn.style.display = 'none';
        
        sidebarTitle.textContent = getYearName(currentActivePart);
        sidebarSubtitle.textContent = 'ניווט מהיר (בחלק הנוכחי)';
        sidebarSubtitle.className = '';
        showNavControls();
        hideHighlightNav();
        
        // === שדרוג: החזרת הכותרת ===
        globalSearchTitle.style.display = 'block';
        if (headerSearchSummary) {
            headerSearchSummary.style.display = 'none';
        }

        loadContent(currentActivePart);
    }

    // --- 6. פונקציות עזר (הדגשה, גלילה, כפתורים) ---
    
    function addVisualSeparators() {
        const headings = contentArea.querySelectorAll('h1, .MsoHeading1');
        headings.forEach((heading, index) => {
            if (index === 0) return;
            if (heading.previousElementSibling && heading.previousElementSibling.classList.contains('visual-separator')) return;

            const separator = document.createElement('div');
            separator.className = 'visual-separator';
            heading.parentNode.insertBefore(separator, heading);
        });
    }

    function highlightSearchTerm(term) {
        const regex = new RegExp(term, 'gi'); 
        contentArea.querySelectorAll('p, h1, h2, h3, .MsoHeading1, .MsoHeading2, .MsoHeading3').forEach(el => {
            el.innerHTML = el.innerHTML.replace(regex, (match) => `<mark>${match}</mark>`);
        });
    }

    function findHeadingElement(headingText) {
        if (!headingText) return null;
        if (headingText.startsWith("(מאמר פתיחה")) {
            return contentArea;
        }
        const headings = contentArea.querySelectorAll('h1, h2, h3, .MsoHeading1, .MsoHeading2, .MsoHeading3');
        const target = Array.from(headings).find(h => h.textContent.trim() === headingText);
        return target || null;
    }
    
    function scrollToElement(element) {
        if (!element) return;
        
        if (element === contentArea) { 
            contentArea.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        let targetElement = element;
        let prev = element.previousElementSibling;
        
        while (prev) {
            if (prev.classList.contains('visual-separator')) {
                targetElement = prev;
                break;
            }
            if (prev.matches('h1, .MsoHeading1')) {
                break;
            }
            prev = prev.previousElementSibling;
        }
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    function updateActiveButton(fileName) {
        partButtons.forEach(btn => btn.classList.remove('active'));
        const activeButton = document.querySelector(`.part-button[data-file="${fileName}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
            currentActivePart = fileName;
        }
    }
    
    function getYearName(fileName) {
        const button = document.querySelector(`.part-button[data-file="${fileName}"]`);
        return button ? button.textContent : "אזור התוכן";
    }

    function hideNavControls() {
        expandAllBtn.style.display = 'none';
        collapseAllBtn.style.display = 'none';
    }
    function showNavControls() {
        expandAllBtn.style.display = 'inline-block';
        collapseAllBtn.style.display = 'inline-block';
    }
    function hideHighlightNav() {
        highlightNav.style.display = 'none';
        allHighlights = [];
        currentHighlightIndex = 0;
    }

    // --- 7. פונקציות ניווט מופעים ---

    function setupHighlightNavigation(targetArticleElement) {
        allHighlights = Array.from(contentArea.querySelectorAll('mark'));
        
        if (allHighlights.length === 0) {
            hideHighlightNav();
            return;
        }

        let startIndex = 0;
        if (targetArticleElement && targetArticleElement !== contentArea) {
            for (let i = 0; i < allHighlights.length; i++) {
                const position = targetArticleElement.compareDocumentPosition(allHighlights[i]);
                if (position === 0 || (position & Node.DOCUMENT_POSITION_FOLLOWING)) { 
                    startIndex = i;
                    break;
                }
            }
        }
        
        currentHighlightIndex = startIndex;
        highlightNav.style.display = 'flex';
        updateHighlightState();
        scrollToHighlight(currentHighlightIndex); 
    }

    function scrollToHighlight(index) {
        if (!allHighlights[index]) return;
        
        allHighlights[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        allHighlights.forEach(mark => mark.style.backgroundColor = 'var(--highlight-bg)'); 
        allHighlights[index].style.backgroundColor = '#ffc000'; // צבע בולט
        
        currentHighlightIndex = index;
        updateHighlightState();
    }


    function updateHighlightState() {
        highlightCounter.textContent = `${currentHighlightIndex + 1} / ${allHighlights.length}`;
        prevHighlightBtn.disabled = (currentHighlightIndex === 0);
        nextHighlightBtn.disabled = (currentHighlightIndex === allHighlights.length - 1);
    }

    // --- 8. פונקציות הניווט הרגיל ---
    
    function buildTableOfContents() {
        tocList.innerHTML = '';
        const headings = contentArea.querySelectorAll('h1, h2, h3, .MsoHeading1, .MsoHeading2, .MsoHeading3');
        let currentH1List = null;
        let h1WithChildren = null;

        if (headings.length === 0) {
            tocList.innerHTML = '<li>לא נמצאו כותרות</li>';
            return;
        }

        headings.forEach(heading => {
            const headingId = 'heading-' + (headingCounter++); // התיקון הקריטי
            heading.id = headingId;
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.textContent = heading.textContent;
            link.href = '#' + headingId;

            const tagName = heading.tagName.toUpperCase();
            const className = heading.className;
            
            if (tagName === 'H1' || className.includes('MsoHeading1')) {
                listItem.classList.add('level-1');
                listItem.appendChild(link);
                currentH1List = document.createElement('ul');
                listItem.appendChild(currentH1List);
                tocList.appendChild(listItem);
                h1WithChildren = listItem;
            } 
            else if ((tagName === 'H2' || className.includes('MsoHeading2') || tagName === 'H3' || className.includes('MsoHeading3')) && currentH1List) {
                if (tagName === 'H2' || className.includes('MsoHeading2')) listItem.classList.add('level-2');
                if (tagName === 'H3' || className.includes('MsoHeading3')) listItem.classList.add('level-3');
                
                listItem.appendChild(link);
                currentH1List.appendChild(listItem);

                if (h1WithChildren && !h1WithChildren.querySelector('.toggle')) {
                    const toggle = document.createElement('span');
                    toggle.className = 'toggle';
                    toggle.textContent = '+';
                    h1WithChildren.prepend(toggle);
                }
            }
        });
        addToggleListeners();
    }

    function addToggleListeners() {
        tocList.querySelectorAll('.level-1 .toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const parentLi = e.target.closest('li');
                parentLi.classList.toggle('open');
                e.target.textContent = parentLi.classList.contains('open') ? '−' : '+';
            });
        });
    }

    // --- 9. הפעלת אירועים (Event Listeners) ---

    partButtons.forEach(button => {
        button.addEventListener('click', function() {
            updateActiveButton(this.getAttribute('data-file'));
            sidebarTitle.textContent = this.textContent;
            resetToDefaultView();
        });
    });

    expandAllBtn.addEventListener('click', () => {
        tocList.querySelectorAll('.level-1').forEach(li => {
            if (li.querySelector('.toggle')) {
                li.classList.add('open');
                li.querySelector('.toggle').textContent = '−';
            }
        });
    });

    collapseAllBtn.addEventListener('click', () => {
        tocList.querySelectorAll('.level-1.open').forEach(li => {
            li.classList.remove('open');
            if (li.querySelector('.toggle')) {
                li.querySelector('.toggle').textContent = '+';
            }
        });
    });
    
    searchBox.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });
    
    clearSearchBtn.addEventListener('click', resetToDefaultView);

    prevHighlightBtn.addEventListener('click', () => {
        if (currentHighlightIndex > 0) {
            scrollToHighlight(currentHighlightIndex - 1);
        }
    });
    nextHighlightBtn.addEventListener('click', () => {
        if (currentHighlightIndex < allHighlights.length - 1) {
            scrollToHighlight(currentHighlightIndex + 1);
        }
    });

    // --- מאזיני אירועים לפיצ'רים ---

    contentArea.addEventListener('scroll', () => {
        if (contentArea.scrollTop > 300) {
            backToTopBtn.style.display = 'block';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    backToTopBtn.addEventListener('click', () => {
        contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    });

    darkModeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        updateTheme();
    });

    function updateTheme() {
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            darkModeBtn.innerHTML = '☀️';
        } else {
            localStorage.setItem('theme', 'light');
            darkModeBtn.innerHTML = '🌙';
        }
    }

    function loadThemePreference() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
        }
        updateTheme();
    }

    fontIncreaseBtn.addEventListener('click', () => {
        changeFontSize(0.1);
    });

    fontDecreaseBtn.addEventListener('click', () => {
        changeFontSize(-0.1);
    });

    function changeFontSize(amount) {
        let newSize = currentFontSize + amount;
        if (newSize < 0.8) newSize = 0.8;
        if (newSize > 2.0) newSize = 2.0;
        
        currentFontSize = newSize;
        contentArea.style.fontSize = currentFontSize + 'rem';
        localStorage.setItem('fontSize', currentFontSize);
    }

    function loadFontPreference() {
        const savedFontSize = localStorage.getItem('fontSize');
        if (savedFontSize) {
            currentFontSize = parseFloat(savedFontSize);
        }
        contentArea.style.fontSize = currentFontSize + 'rem';
    }

    // --- 10. התחלה! ---
    
    loadThemePreference();
    loadFontPreference();
    loadSearchIndex();
    
    const firstButton = document.querySelector('.part-button');
    if (firstButton) {
        firstButton.classList.add('active');
        sidebarTitle.textContent = firstButton.textContent;
        currentActivePart = firstButton.getAttribute('data-file');
        loadContent(currentActivePart);
    }
});