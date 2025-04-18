// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD9myB6phhwC9DzTnfok2tjKxc4aPvDVXY",
    authDomain: "son-of-the-week.firebaseapp.com",
    projectId: "son-of-the-week",
    storageBucket: "son-of-the-week.firebasestorage.app",
    messagingSenderId: "632406897939",
    appId: "1:632406897939:web:62d36dda966dcd565416e6",
    measurementId: "G-48RYQSMEFK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// DOM Elements
const publicPage = document.getElementById('public-page');
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const authBtn = document.getElementById('auth-btn');
const backBtn = document.getElementById('back-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const photoUpload = document.getElementById('photo-upload');
const photosContainer = document.getElementById('photos-container');
const aboutText = document.getElementById('about-text');
const saveAboutBtn = document.getElementById('save-about-btn');
const publicAbout = document.getElementById('public-about');
const publicPhotos = document.getElementById('public-photos');
const publicPagination = document.getElementById('public-pagination');
const dashboardPagination = document.getElementById('dashboard-pagination');
const photoModal = document.getElementById('photo-modal');
const modalImage = document.getElementById('modal-image');
const loader = document.getElementById('loader');

// Pagination settings
const PHOTOS_PER_PAGE = 12;
let publicCurrentPage = 1;
let dashboardCurrentPage = 1;
let publicTotalPages = 1;
let dashboardTotalPages = 1;
let publicDocsCache = []; // Cache documents for public pagination
let dashboardDocsCache = []; // Cache documents for dashboard pagination

// Show status message
function showStatus(message) {
    const status = document.createElement('div');
    status.className = 'status-message';
    status.textContent = message;
    document.body.appendChild(status);
    setTimeout(() => status.remove(), 3000);
}

// Compress image
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', 0.7);
            };
        };
    });
}

// Render pagination
function renderPagination(container, currentPage, totalPages, onPageChange) {
    container.innerHTML = '';
    if (totalPages <= 1) return; // Hide pagination if only one page

    const prevButton = document.createElement('button');
    prevButton.textContent = '<';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => onPageChange(currentPage - 1));
    
    const nextButton = document.createElement('button');
    nextButton.textContent = '>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => onPageChange(currentPage + 1));

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = i === currentPage ? 'active' : '';
        pageButton.addEventListener('click', () => onPageChange(i));
        pageNumbers.push(pageButton);
    }

    container.appendChild(prevButton);
    pageNumbers.forEach(button => container.appendChild(button));
    container.appendChild(nextButton);
}

// Auth state listener
auth.onAuthStateChanged(user => {
    if (user) {
        publicPage.classList.add('hidden');
        loginPage.classList.add('hidden');
        dashboardPage.classList.remove('hidden');
        authBtn.textContent = 'Logout';
        loadUserData(user.uid);
    } else {
        publicPage.classList.remove('hidden');
        loginPage.classList.add('hidden');
        dashboardPage.classList.add('hidden');
        authBtn.textContent = 'Login';
        const defaultUserId = 'On1zDyx1Y9NDBAH3duteYePrPqs1'; // Use correct UID
        console.log("Auth state: No user logged in, loading public data for:", defaultUserId);
        loadPublicData(defaultUserId);
    }
});

// Auth button handler
authBtn.addEventListener('click', () => {
    if (auth.currentUser) {
        auth.signOut();
    } else {
        publicPage.classList.add('hidden');
        loginPage.classList.remove('hidden');
    }
});

// Back button handler
backBtn.addEventListener('click', () => {
    loginPage.classList.add('hidden');
    publicPage.classList.remove('hidden');
});

// Login
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        loginError.textContent = "Please enter both email and password";
        return;
    }
    
    loader.style.display = 'block';
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            loader.style.display = 'none';
        })
        .catch(error => {
            loader.style.display = 'none';
            loginError.textContent = error.message;
        });
});

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tabContents.forEach(content => content.classList.add('hidden'));
        document.getElementById(`${tabId}-tab`).classList.remove('hidden');
    });
});

// Photo upload
photoUpload.addEventListener('change', async (e) => {
    const files = e.target.files;
    const userId = auth.currentUser.uid;
    loader.style.display = 'block';
    
    const uploadPromises = [];
    
    for (const file of files) {
        if (!file.type.match('image.*')) continue;
        
        const compressedFile = await compressImage(file);
        const storageRef = storage.ref(`users/${userId}/photos/${file.name}`);
        const uploadTask = storageRef.put(compressedFile);
        
        const uploadPromise = new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                null,
                (error) => {
                    console.error("Upload error:", error);
                    reject(error);
                },
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                        db.collection('users').doc(userId).collection('photos').add({
                            url: downloadURL,
                            name: file.name,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        }).then(() => resolve());
                    });
                }
            );
        });
        
        uploadPromises.push(uploadPromise);
    }
    
    Promise.all(uploadPromises)
        .then(() => {
            loader.style.display = 'none';
            showStatus('Photos uploaded!');
            loadUserPhotos(userId); // Reload gallery
        })
        .catch(() => {
            loader.style.display = 'none';
            showStatus('Some uploads failed');
        });
    
    e.target.value = '';
});

// Load user photos with pagination
function loadUserPhotos(userId) {
    photosContainer.innerHTML = '';
    dashboardDocsCache = [];
    dashboardCurrentPage = 1; // Reset to page 1
    
    const photosQuery = db.collection('users').doc(userId).collection('photos')
        .orderBy('createdAt', 'desc');
    
    loader.style.display = 'block';
    photosQuery.get().then(snapshot => {
        loader.style.display = 'none';
        dashboardTotalPages = Math.ceil(snapshot.size / PHOTOS_PER_PAGE);
        snapshot.forEach(doc => dashboardDocsCache.push(doc));
        
        if (snapshot.empty) {
            photosContainer.innerHTML = '<div class="no-content">No photos uploaded yet.</div>';
        }
        
        renderPagination(dashboardPagination, dashboardCurrentPage, dashboardTotalPages, (page) => {
            dashboardCurrentPage = page;
            loadUserPhotosPage(page);
        });
        
        loadUserPhotosPage(dashboardCurrentPage);
    }).catch(error => {
        loader.style.display = 'none';
        console.error("Error fetching user photos:", error);
        showStatus('Failed to load photos');
        photosContainer.innerHTML = '<div class="no-content">Error loading photos. Please try again later.</div>';
    });
}

function loadUserPhotosPage(page) {
    photosContainer.innerHTML = '';
    const startIndex = (page - 1) * PHOTOS_PER_PAGE;
    const endIndex = startIndex + PHOTOS_PER_PAGE;
    
    const docsToShow = dashboardDocsCache.slice(startIndex, endIndex);
    if (docsToShow.length === 0 && page === 1) {
        photosContainer.innerHTML = '<div class="no-content">No photos uploaded yet.</div>';
    }
    
    docsToShow.forEach(doc => addPhotoCard(doc));
}

// Add photo card
function addPhotoCard(doc) {
    const data = doc.data();
    const photoId = doc.id;
    
    const photoCard = document.createElement('div');
    photoCard.className = 'photo-card fade-in';
    photoCard.id = `photo-${photoId}`;
    
    photoCard.innerHTML = `
        <img src="${data.url}" alt="${data.name}" class="photo-img" data-url="${data.url}">
        <div class="photo-actions">
            <button class="delete-photo" data-id="${photoId}" data-url="${data.url}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    photosContainer.appendChild(photoCard);
    
    photoCard.querySelector('.photo-img').addEventListener('click', showPhotoModal);
    photoCard.querySelector('.delete-photo').addEventListener('click', deletePhoto);
}

// Delete photo
function deletePhoto(e) {
    const photoId = e.target.getAttribute('data-id') || 
                   e.target.parentElement.getAttribute('data-id');
    const photoUrl = e.target.getAttribute('data-url') || 
                    e.target.parentElement.getAttribute('data-url');
    const userId = auth.currentUser.uid;
    
    if (confirm("Are you sure you want to delete this photo?")) {
        loader.style.display = 'block';
        Promise.all([
            db.collection('users').doc(userId).collection('photos').doc(photoId).delete(),
            storage.refFromURL(photoUrl).delete()
        ])
        .then(() => {
            loader.style.display = 'none';
            showStatus('Photo deleted!');
            loadUserPhotos(userId); // Reload gallery
        })
        .catch(error => {
            loader.style.display = 'none';
            showStatus('Deletion failed');
            console.error("Deletion error:", error);
        });
    }
}

// Load about text
function loadAboutText(userId) {
    console.log("Fetching about text for user:", userId);
    db.collection('users').doc(userId).collection('info').doc('about')
        .get()
        .then(doc => {
            if (doc.exists) {
                const text = doc.data().text || '';
                aboutText.value = text;
                publicAbout.innerHTML = text ? text.replace(/\n/g, '<br>') : '<div class="no-content">No about text available.</div>';
            } else {
                console.log("No about text found for user:", userId);
                publicAbout.innerHTML = '<div class="no-content">No about text available.</div>';
            }
        })
        .catch(error => {
            console.error("Error loading about text:", error);
            showStatus('Failed to load about text');
            publicAbout.innerHTML = '<div class="no-content">Error loading about text.</div>';
        });
}

// Save about text
saveAboutBtn.addEventListener('click', () => {
    const userId = auth.currentUser.uid;
    const text = aboutText.value;
    loader.style.display = 'block';
    
    db.collection('users').doc(userId).collection('info').doc('about')
        .set({ text })
        .then(() => {
            loader.style.display = 'none';
            showStatus('About saved!');
            publicAbout.innerHTML = text ? text.replace(/\n/g, '<br>') : '<div class="no-content">No about text available.</div>';
        })
        .catch(() => {
            loader.style.display = 'none';
            showStatus('Save failed');
        });
});

// Load public photos with pagination
function loadPublicPhotos(userId) {
    publicPhotos.innerHTML = '';
    publicDocsCache = [];
    publicCurrentPage = 1; // Reset to page 1
    
    console.log("Fetching public photos for user:", userId);
    const photosQuery = db.collection('users').doc(userId).collection('photos')
        .orderBy('createdAt', 'desc');
    
    loader.style.display = 'block';
    photosQuery.get().then(snapshot => {
        loader.style.display = 'none';
        publicTotalPages = Math.ceil(snapshot.size / PHOTOS_PER_PAGE);
        snapshot.forEach(doc => publicDocsCache.push(doc));
        
        console.log("Public photos fetched:", publicDocsCache.length);
        if (snapshot.empty) {
            publicPhotos.innerHTML = '<div class="no-content">No photos available.</div>';
        }
        
        renderPagination(publicPagination, publicCurrentPage, publicTotalPages, (page) => {
            publicCurrentPage = page;
            loadPublicPhotosPage(page);
        });
        
        loadPublicPhotosPage(publicCurrentPage);
    }).catch(error => {
        loader.style.display = 'none';
        console.error("Error fetching public photos:", error);
        showStatus('Failed to load photos');
        publicPhotos.innerHTML = '<div class="no-content">Error loading photos. Please try again later.</div>';
    });
}

function loadPublicPhotosPage(page) {
    publicPhotos.innerHTML = '';
    const seenUrls = new Set();
    const startIndex = (page - 1) * PHOTOS_PER_PAGE;
    const endIndex = startIndex + PHOTOS_PER_PAGE;
    
    const docsToShow = publicDocsCache.slice(startIndex, endIndex);
    console.log(`Loading public photos page ${page}: ${docsToShow.length} photos`);
    if (docsToShow.length === 0 && page === 1) {
        publicPhotos.innerHTML = '<div class="no-content">No photos available.</div>';
    }
    
    docsToShow.forEach(doc => {
        const data = doc.data();
        if (!seenUrls.has(data.url)) {
            seenUrls.add(data.url);
            const photoDiv = document.createElement('div');
            photoDiv.className = 'public-photo fade-in';
            photoDiv.innerHTML = `<img src="${data.url}" alt="${data.name}" data-url="${data.url}">`;
            publicPhotos.appendChild(photoDiv);
            photoDiv.querySelector('img').addEventListener('click', showPhotoModal);
        }
    });
}

// Show photo modal
function showPhotoModal(e) {
    modalImage.src = e.target.getAttribute('data-url');
    photoModal.style.display = 'flex';
}

// Close modal
photoModal.addEventListener('click', (e) => {
    if (e.target === photoModal) {
        photoModal.style.display = 'none';
    }
});

// Load all user data
function loadUserData(userId) {
    console.log("Loading user data for:", userId);
    loadUserPhotos(userId);
    loadAboutText(userId);
}

// Load public view data
function loadPublicData(userId) {
    console.log("Loading public data for user:", userId);
    loadPublicPhotos(userId);
    loadAboutText(userId);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const defaultUserId = 'On1zDyx1Y9NDBAH3duteYePrPqs1'; // Use correct UID
    console.log("Initializing with default user ID:", defaultUserId);
    loadPublicData(defaultUserId);
});