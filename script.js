// Data materi (akan diganti dengan data dari materials.json)
let materials = [];
let featuredMaterials = [];

// Elemen DOM
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const aiHelpBtn = document.getElementById('ai-help-btn');
const featuredGrid = document.getElementById('featured-grid');
const allMaterialsGrid = document.getElementById('all-materials-grid');
const aiModal = document.getElementById('ai-modal');
const previewModal = document.getElementById('preview-modal');
const closeButtons = document.querySelectorAll('.close');
const pdfViewer = document.getElementById('pdf-viewer');
const imageViewer = document.getElementById('image-viewer');
const textViewer = document.getElementById('text-viewer');
const downloadBtn = document.getElementById('download-btn');
const previewTitle = document.getElementById('preview-title');
const aiMessages = document.getElementById('ai-messages');
const aiQuestion = document.getElementById('ai-question');
const aiSend = document.getElementById('ai-send');

// Inisialisasi PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.js/pdf.worker.js';

// Load data dari materials.json
fetch('data/materials.json')
    .then(response => response.json())
    .then(data => {
        materials = data.materials;
        featuredMaterials = data.featured;
        renderMaterials();
    })
    .catch(error => console.error('Error loading materials:', error));

// Render materi ke grid
function renderMaterials(filteredMaterials = null) {
    featuredGrid.innerHTML = '';
    allMaterialsGrid.innerHTML = '';
    
    const materialsToRender = filteredMaterials || materials;
    
    // Render featured materials
    featuredMaterials.forEach(id => {
        const material = materials.find(m => m.id === id);
        if (material) {
            featuredGrid.appendChild(createMaterialCard(material));
        }
    });
    
    // Render all materials
    materialsToRender.forEach(material => {
        if (!featuredMaterials.includes(material.id)) {
            allMaterialsGrid.appendChild(createMaterialCard(material));
        }
    });
}

// Buat card materi
function createMaterialCard(material) {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.dataset.id = material.id;
    
    const thumbnail = document.createElement('div');
    thumbnail.className = 'material-thumbnail';
    
    // Tentukan thumbnail berdasarkan tipe file
    if (material.thumbnail) {
        const img = document.createElement('img');
        img.src = material.thumbnail;
        img.alt = material.title;
        thumbnail.appendChild(img);
    } else {
        const icon = document.createElement('div');
        icon.className = 'file-icon';
        
        // Icon berdasarkan tipe file
        if (material.fileType === 'pdf') {
            icon.innerHTML = '📄';
            icon.title = 'Dokumen PDF';
        } else if (material.fileType === 'doc' || material.fileType === 'docx') {
            icon.innerHTML = '📝';
            icon.title = 'Dokumen Word';
        } else if (material.fileType === 'ppt' || material.fileType === 'pptx') {
            icon.innerHTML = '📊';
            icon.title = 'Presentasi PowerPoint';
        } else if (material.fileType === 'jpg' || material.fileType === 'png') {
            icon.innerHTML = '🖼️';
            icon.title = 'Gambar';
        } else {
            icon.innerHTML = '📂';
            icon.title = 'File';
        }
        
        thumbnail.appendChild(icon);
    }
    
    const info = document.createElement('div');
    info.className = 'material-info';
    
    const title = document.createElement('h3');
    title.className = 'material-title';
    title.textContent = material.title;
    
    const meta = document.createElement('div');
    meta.className = 'material-meta';
    
    const type = document.createElement('span');
    type.textContent = material.fileType.toUpperCase();
    
    const date = document.createElement('span');
    date.textContent = formatDate(material.uploadDate);
    
    meta.appendChild(type);
    meta.appendChild(date);
    
    info.appendChild(title);
    info.appendChild(meta);
    
    card.appendChild(thumbnail);
    card.appendChild(info);
    
    // Tambahkan event listener untuk preview
    card.addEventListener('click', () => previewMaterial(material));
    
    return card;
}

// Format tanggal
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Preview materi
function previewMaterial(material) {
    previewTitle.textContent = material.title;
    downloadBtn.href = material.url;
    
    // Sembunyikan semua viewer terlebih dahulu
    pdfViewer.style.display = 'none';
    imageViewer.style.display = 'none';
    textViewer.style.display = 'none';
    
    // Tampilkan viewer yang sesuai
    if (material.fileType === 'pdf') {
        pdfViewer.style.display = 'block';
        renderPDF(material.url);
    } else if (['jpg', 'png', 'jpeg'].includes(material.fileType)) {
        imageViewer.style.display = 'flex';
        imageViewer.innerHTML = `<img src="${material.url}" alt="${material.title}">`;
    } else if (material.fileType === 'txt') {
        textViewer.style.display = 'block';
        fetch(material.url)
            .then(response => response.text())
            .then(text => {
                textViewer.textContent = text;
            });
    } else {
        textViewer.style.display = 'block';
        textViewer.innerHTML = `<p>Preview tidak tersedia untuk tipe file ini. Silakan download untuk melihat.</p>`;
    }
    
    previewModal.style.display = 'block';
}

// Render PDF
function renderPDF(url) {
    pdfjsLib.getDocument(url).promise.then(function(pdf) {
        pdf.getPage(1).then(function(page) {
            const viewport = page.getViewport({ scale: 1.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            pdfViewer.innerHTML = '';
            pdfViewer.appendChild(canvas);
            
            page.render({
                canvasContext: context,
                viewport: viewport
            });
        });
    }).catch(error => {
        pdfViewer.innerHTML = `<p>Gagal memuat PDF. Silakan download untuk melihat.</p>`;
        console.error('PDF rendering error:', error);
    });
}

// Setup search dengan Fuse.js
function setupSearch() {
    const options = {
        keys: ['title', 'description', 'tags'],
        includeScore: true,
        threshold: 0.4
    };
    
    const fuse = new Fuse(materials, options);
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    function performSearch() {
        const query = searchInput.value.trim();
        if (query === '') {
            renderMaterials();
            return;
        }
        
        const results = fuse.search(query);
        const filteredMaterials = results.map(result => result.item);
        renderMaterials(filteredMaterials);
    }
}

// AI Assistant
function setupAIAssistant() {
    aiHelpBtn.addEventListener('click', () => {
        aiModal.style.display = 'block';
    });
    
    aiSend.addEventListener('click', sendAIQuestion);
    aiQuestion.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') sendAIQuestion();
    });
    
    function sendAIQuestion() {
        const question = aiQuestion.value.trim();
        if (!question) return;
        
        addAIMessage(question, 'user');
        aiQuestion.value = '';
        
        // Simulasi respon AI (dalam implementasi nyata, ini akan memanggil API)
        setTimeout(() => {
            const response = generateAIResponse(question);
            addAIMessage(response, 'bot');
        }, 1000);
    }
    
    function addAIMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${sender}`;
        messageDiv.textContent = text;
        aiMessages.appendChild(messageDiv);
        aiMessages.scrollTop = aiMessages.scrollHeight;
    }
    
    // Fungsi sederhana untuk menghasilkan respon AI
    function generateAIResponse(question) {
        const responses = [
            `Untuk pertanyaan "${question}", materi yang relevan bisa Anda temukan dengan judul "Konsep Dasar Ekonomi Makro" dan "Teori Sosial Modern".`,
            `Pertanyaan bagus! Saya menemukan beberapa materi terkait "${question}" dalam koleksi kami. Coba cari "Sejarah Peradaban Dunia" atau "Geografi Regional".`,
            `Tentang "${question}", Olympiczy memiliki beberapa catatan ringkas dan presentasi yang mungkin membantu. Saya sarankan melihat materi tentang "Sosiologi Kontemporer".`,
            `Pertanyaan yang menarik! Untuk "${question}", Anda mungkin ingin memeriksa dokumen "Analisis Kasus Olimpiade IPS 2022" dan "Bank Soal Olimpiade IPS".`
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// Tutup modal
closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        aiModal.style.display = 'none';
        previewModal.style.display = 'none';
    });
});

// Tutup modal saat klik di luar konten
window.addEventListener('click', (event) => {
    if (event.target === aiModal) {
        aiModal.style.display = 'none';
    }
    if (event.target === previewModal) {
        previewModal.style.display = 'none';
    }
});

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    setupAIAssistant();
});
