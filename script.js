// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyD9myB6phhwC9DzTnfok2tjKxc4aPvDVXY",
    authDomain: "son-of-the-week.firebaseapp.com",
    projectId: "son-of-the-week",
    storageBucket: "son-of-the-week.appspot.com",
    messagingSenderId: "632406897939",
    appId: "1:632406897939:web:62d36dda966dcd565416e6",
    measurementId: "G-48RYQSMEFK"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Admin email (replace with your email)
const ADMIN_EMAIL = "mav@cook.com";

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const confirmLoginBtn = document.getElementById('confirmLoginBtn');
const userInfo = document.getElementById('userInfo');
const editSiteBtn = document.getElementById('editSiteBtn');
const siteTitle = document.getElementById('siteTitle');
const viewGalleryBtn = document.getElementById('viewGalleryBtn');

// Edit controls
const editControls = document.querySelectorAll('.edit-control');
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const editSiteModal = new bootstrap.Modal(document.getElementById('editSiteModal'));

// Current user data
let currentUser = null;
let userData = {
    name: "Maverick the Astronaut",
    mission: "Mission: Explore the galaxy!",
    profileImageUrl: "https://cdn-icons-png.flaticon.com/512/1864/1864593.png",
    color: "#4d79ff",
    theme: "default"
};

// Default space facts
const defaultFacts = [
    /*"One day on Venus is longer than one year on Earth!",
    "Neutron stars can spin 600 times per second!",
    "There are more stars in the universe than grains of sand on all the beaches on Earth!",
    "The Sun makes up 99.86% of the mass in our solar system!",
    "A teaspoon of neutron star material would weigh about 6 billion tons!"
    */
];

// Pagination for facts
let currentFactPage = 1;
const factsPerPage = 3;
let totalFacts = 0;

// Pagination for gallery
let currentGalleryPage = 1;
const galleryPerPage = 6; // Show 6 images per page
let totalGalleryImages = 0;

// Initialize the app
function initApp() {
    auth.onAuthStateChanged(user => {
        if (user && user.email === ADMIN_EMAIL) {
            // Admin is logged in
            currentUser = user;
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            userInfo.textContent = 'Welcome, Space Admin!';
            
            // Show edit controls
            editControls.forEach(control => control.style.display = 'block');
            
            // Load all data
            loadUserData();
            loadPosts();
            loadFacts();
            loadGallery();
            loadSiteSettings();
        } else {
            // Not logged in or not admin
            currentUser = null;
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            userInfo.textContent = '';
            
            // Hide edit controls
            editControls.forEach(control => control.style.display = 'none');
            
            // Still load data for viewing
            loadPosts();
            loadFacts();
            loadGallery();
            loadSiteSettings();
        }
    });
    
    // Set up event listeners
    setupEventListeners();
}

// Set up all event listeners
function setupEventListeners() {
    // Login/logout
    loginBtn.addEventListener('click', () => loginModal.show());
    logoutBtn.addEventListener('click', logout);
    confirmLoginBtn.addEventListener('click', emailLogin);
    
    // Site editing
    editSiteBtn.addEventListener('click', () => {
        db.collection('settings').doc('site').get().then(doc => {
            const settings = doc.exists ? doc.data() : { title: "Maverick's Space Explorer", icon: "rocket" };
            document.getElementById('siteTitleInput').value = settings.title;
            document.getElementById('siteIconSelect').value = settings.icon;
            editSiteModal.show();
        });
    });
    
    document.getElementById('saveSiteSettingsBtn').addEventListener('click', saveSiteSettings);
    
    // Profile editing
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        document.getElementById('profileNameInput').value = userData.name;
        document.getElementById('profileMissionInput').value = userData.mission;
        document.getElementById('profileColorInput').value = userData.color;
        new bootstrap.Modal(document.getElementById('editProfileModal')).show();
    });
    
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    
    // Posts
    document.getElementById('addPostBtn').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('addPostModal')).show();
    });
    
    document.getElementById('addPostBtn2').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('addPostModal')).show();
    });
    
    document.getElementById('savePostBtn').addEventListener('click', addPost);
    
    // Facts
    document.getElementById('addFactBtn').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('addFactModal')).show();
    });
    
    document.getElementById('saveFactBtn').addEventListener('click', addFact);
    
    // Gallery
    document.getElementById('uploadImageBtn').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('uploadImageModal')).show();
    });
    
    document.getElementById('saveImageBtn').addEventListener('click', uploadImage);
    
    // Theme
    document.getElementById('changeThemeBtn').addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('themeModal')).show();
    });
    
    document.getElementById('saveThemeBtn').addEventListener('click', saveThemeSelection);
    
    // Theme selection
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            // Show feedback
            const themeName = option.querySelector('p').textContent;
            showAlert('Theme Selected', `${themeName} theme is ready to apply`, 'info', 1500);
        });
    });
    
    // View Gallery button
    viewGalleryBtn.addEventListener('click', () => {
        document.getElementById('imageGallery').scrollIntoView({ behavior: 'smooth' });
    });
    
    // Set default theme selection
    document.querySelector('.theme-option[data-theme="default"]').classList.add('selected');
}

// Email login
function emailLogin() {
    const email = loginEmail.value;
    const password = loginPassword.value;
    
    if (!email || !password) {
        showAlert('Error', 'Please enter both email and password', 'error');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            if (userCredential.user.email !== ADMIN_EMAIL) {
                auth.signOut();
                showAlert('Access Denied', 'Only the space admin can edit this page', 'error');
                return;
            }
            loginModal.hide();
            showAlert('Welcome!', 'You are now in admin mode', 'success');
        })
        .catch(error => {
            showAlert('Login Failed', error.message, 'error');
        });
}

// Sign out
function logout() {
    auth.signOut().then(() => {
        showAlert('Logged Out', 'You have successfully logged out', 'success');
    }).catch(error => {
        showAlert('Error', error.message, 'error');
    });
}

// Load site settings (title, icon, etc.)
function loadSiteSettings() {
    db.collection('settings').doc('site').get()
        .then(doc => {
            if (doc.exists) {
                const settings = doc.data();
                siteTitle.innerHTML = `<i class="fas fa-${settings.icon || 'rocket'}"></i> ${settings.title || "Maverick's Space Explorer"}`;
                
                // Apply site-wide theme if it exists
                if (settings.theme) {
                    applyTheme(settings.theme, settings.color);
                }
            } else {
                // Initialize with default settings
                db.collection('settings').doc('site').set({
                    title: "Maverick's Space Explorer",
                    icon: "rocket",
                    theme: "default",
                    color: "#4d79ff",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        })
        .catch(error => {
            console.error("Error loading site settings:", error);
        });
}

// Save site settings
function saveSiteSettings() {
    const newTitle = document.getElementById('siteTitleInput').value;
    const newIcon = document.getElementById('siteIconSelect').value;
    
    db.collection('settings').doc('site').set({
        title: newTitle,
        icon: newIcon,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .then(() => {
        showAlert('Saved!', 'Site settings updated', 'success');
        loadSiteSettings();
        editSiteModal.hide();
    })
    .catch(error => {
        showAlert('Error', error.message, 'error');
    });
}

// Load user data from Firestore
function loadUserData() {
    if (!currentUser) return;
    
    db.collection('users').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                userData = doc.data();
                updateProfileDisplay();
                applyTheme(userData.theme, userData.color);
            } else {
                // Initialize user data
                db.collection('users').doc(currentUser.uid).set({
                    name: "Maverick the Astronaut",
                    mission: "Mission: Explore the galaxy!",
                    profileImageUrl: "https://cdn-icons-png.flaticon.com/512/1864/1864593.png",
                    color: "#4d79ff",
                    theme: "default",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        })
        .catch(error => {
            console.error("Error loading user data:", error);
        });
}

// Update profile display
function updateProfileDisplay() {
    document.getElementById('profileName').textContent = userData.name;
    document.getElementById('profileMission').textContent = userData.mission;
    document.getElementById('profileImage').src = userData.profileImageUrl;
    
    // Apply profile color to elements
    document.documentElement.style.setProperty('--primary-color', userData.color);
    document.querySelectorAll('.btn-space').forEach(btn => {
        btn.style.backgroundColor = userData.color;
        btn.style.boxShadow = `0 0 10px ${hexToRgba(userData.color, 0.5)}`;
    });
}

// Compress image function
async function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Save profile data
async function saveProfile() {
    if (!currentUser) return;
    
    const newData = {
        name: document.getElementById('profileNameInput').value,
        mission: document.getElementById('profileMissionInput').value,
        color: document.getElementById('profileColorInput').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Check if a new image was uploaded
    const fileInput = document.getElementById('profileImageUpload');
    if (fileInput.files[0]) {
        try {
            const file = fileInput.files[0];
            // Compress the image before uploading
            const compressedBlob = await compressImage(file);
            const storageRef = storage.ref(`users/${currentUser.uid}/profile/profile_${Date.now()}.jpg`);
            
            await storageRef.put(compressedBlob);
            const url = await storageRef.getDownloadURL();
            newData.profileImageUrl = url;
        } catch (error) {
            console.error("Error uploading image:", error);
            showAlert('Error', 'Failed to upload profile image', 'error');
        }
    }
    
    updateUserData(newData);
}

// Update user data in Firestore
function updateUserData(data) {
    db.collection('users').doc(currentUser.uid).update(data)
        .then(() => {
            userData = {...userData, ...data};
            updateProfileDisplay();
            bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
            showAlert('Profile Updated!', '', 'success', 1500);
        })
        .catch(error => {
            showAlert('Update Failed', error.message, 'error');
        });
}

// Load posts from Firestore
function loadPosts() {
    missionPosts.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div></div>';
    
    db.collection('posts').orderBy('createdAt', 'desc').get()
        .then(querySnapshot => {
            missionPosts.innerHTML = '';
            
            if (querySnapshot.empty) {
                missionPosts.innerHTML = '<p class="text-center">No posts yet. Add your first space post!</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const post = doc.data();
                post.id = doc.id;
                displayPost(post);
            });
        })
        .catch(error => {
            console.error("Error loading posts:", error);
            missionPosts.innerHTML = '<p class="text-center text-danger">Error loading posts</p>';
        });
}

// Display a post
function displayPost(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post-card';
    postElement.innerHTML = `
        <div class="post-header">
            <h5 class="post-title" ${currentUser ? 'contenteditable="true"' : ''}>${post.title}</h5>
            ${currentUser ? `<button class="btn btn-sm btn-space save-post" data-id="${post.id}">Save</button>` : ''}
        </div>
        <p class="post-content" ${currentUser ? 'contenteditable="true"' : ''}>${post.content}</p>
        ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image" alt="Post image" data-bs-toggle="modal" data-bs-target="#imageModal" data-img="${post.imageUrl}">` : ''}
        <div class="post-footer">
            <span>${post.createdAt?.toDate().toLocaleDateString() || 'Unknown date'}</span>
            <div class="post-likes">
                <button class="btn btn-sm btn-like ${post.likes && post.likes[currentUser?.uid] ? 'liked' : ''}" 
                        data-id="${post.id}">
                    <i class="fas fa-heart"></i> 
                    <span class="like-count">${post.likes ? Object.keys(post.likes).length : 0}</span>
                </button>
            </div>
            ${currentUser ? `<button class="btn btn-sm btn-danger delete-post" data-id="${post.id}">
                <i class="fas fa-trash"></i>
            </button>` : ''}
        </div>
    `;
    
    // Add event listeners
    if (currentUser) {
        postElement.querySelector('.save-post').addEventListener('click', () => savePost(post.id));
        postElement.querySelector('.delete-post').addEventListener('click', () => deletePost(post.id, post.imagePath));
    }
    
    postElement.querySelector('.btn-like').addEventListener('click', () => toggleLike(post.id));
    
    missionPosts.appendChild(postElement);
}

// Toggle like on a post
function toggleLike(postId) {
    if (!auth.currentUser) {
        showAlert('Login Required', 'You need to be logged in to like posts', 'info');
        return;
    }
    
    const postRef = db.collection('posts').doc(postId);
    const userId = auth.currentUser.uid;
    
    db.runTransaction(transaction => {
        return transaction.get(postRef).then(postDoc => {
            if (!postDoc.exists) throw "Post doesn't exist";
            
            const post = postDoc.data();
            const likes = post.likes || {};
            
            if (likes[userId]) {
                delete likes[userId]; // Unlike
            } else {
                likes[userId] = true; // Like
            }
            
            transaction.update(postRef, { likes });
            return Object.keys(likes).length;
        });
    }).then(likeCount => {
        // Update UI
        const likeBtn = document.querySelector(`.btn-like[data-id="${postId}"]`);
        const likeCountEl = likeBtn.querySelector('.like-count');
        
        likeBtn.classList.toggle('liked');
        likeCountEl.textContent = likeCount;
    }).catch(error => {
        showAlert('Error', error.message, 'error');
    });
}

// Save edited post
function savePost(postId) {
    const postElement = document.querySelector(`[data-id="${postId}"]`).closest('.post-card');
    const title = postElement.querySelector('.post-title').textContent;
    const content = postElement.querySelector('.post-content').textContent;
    
    db.collection('posts').doc(postId).update({
        title,
        content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showAlert('Saved!', 'Post updated successfully', 'success', 1500);
    })
    .catch(error => {
        showAlert('Error', error.message, 'error');
    });
}

// Add a new post
async function addPost() {
    const postData = {
        title: document.getElementById('postTitleInput').value,
        content: document.getElementById('postContentInput').value,
        likes: {},
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (currentUser) {
        postData.userId = currentUser.uid;
    }
    
    // Check if an image was uploaded
    const fileInput = document.getElementById('postImageUpload');
    if (fileInput.files[0]) {
        try {
            const file = fileInput.files[0];
            // Compress the image before uploading
            const compressedBlob = await compressImage(file);
            const storageRef = storage.ref(`posts/${Date.now()}_${file.name}`);
            
            // Put the compressed file in storage
            const uploadTask = storageRef.put(compressedBlob);
            
            await uploadTask;
            const url = await storageRef.getDownloadURL();
            postData.imageUrl = url;
            postData.imagePath = uploadTask.snapshot.ref.fullPath;
        } catch (error) {
            console.error("Error uploading image:", error);
            showAlert('Error', 'Image upload failed', 'error');
            return;
        }
    }
    
    savePostToFirestore(postData);
}

// Save post to Firestore
function savePostToFirestore(postData) {
    db.collection('posts').add(postData)
        .then(docRef => {
            postData.id = docRef.id;
            displayPost(postData);
            bootstrap.Modal.getInstance(document.getElementById('addPostModal')).hide();
            document.getElementById('postTitleInput').value = '';
            document.getElementById('postContentInput').value = '';
            document.getElementById('postImageUpload').value = '';
            showAlert('Posted!', 'Your space post has been added', 'success', 1500);
        })
        .catch(error => {
            showAlert('Post Failed', error.message, 'error');
        });
}

// Delete a post
function deletePost(postId, imagePath) {
    Swal.fire({
        title: 'Delete Post?',
        text: 'Are you sure you want to delete this space post?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        background: '#0e1238',
        color: '#fff',
        confirmButtonColor: '#ff4d4d',
    }).then((result) => {
        if (result.isConfirmed) {
            // Delete from Firestore
            db.collection('posts').doc(postId).delete()
                .then(() => {
                    // Delete image from storage if it exists
                    if (imagePath) {
                        storage.ref(imagePath).delete()
                            .catch(error => console.error("Error deleting image:", error));
                    }
                    
                    // Remove from UI
                    document.querySelector(`[data-id="${postId}"]`).closest('.post-card').remove();
                    
                    showAlert('Deleted!', 'Your post has been deleted', 'success', 1500);
                })
                .catch(error => {
                    showAlert('Delete Failed', error.message, 'error');
                });
        }
    });
}

// Load space facts with pagination
function loadFacts() {
    spaceFacts.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div></div>';
    
    // First get the total count
    db.collection('facts').get()
        .then(countSnapshot => {
            totalFacts = countSnapshot.size;
            
            // Then get the paginated data
            return db.collection('facts')
                .orderBy('createdAt', 'desc')
                .limit(factsPerPage)
                .get();
        })
        .then(querySnapshot => {
            spaceFacts.innerHTML = '';
            
            if (querySnapshot.empty && currentFactPage === 1) {
                // Add default facts if no facts exist
                defaultFacts.forEach(fact => {
                    displayFact({ text: fact, id: 'default' });
                });
                return;
            }
            
            querySnapshot.forEach(doc => {
                const fact = doc.data();
                fact.id = doc.id;
                displayFact(fact);
            });
            
            // Add pagination controls
            addPaginationControls();
        })
        .catch(error => {
            console.error("Error loading facts:", error);
            spaceFacts.innerHTML = '<p class="text-center text-danger">Error loading facts</p>';
        });
}

function displayFacts(querySnapshot) {
    spaceFacts.innerHTML = '';
    
    if (querySnapshot.empty && currentFactPage === 1) {
        // Add default facts if no facts exist
        defaultFacts.forEach(fact => {
            displayFact({ text: fact, id: 'default' });
        });
        return;
    }
    
    querySnapshot.forEach(doc => {
        const fact = doc.data();
        fact.id = doc.id;
        displayFact(fact);
    });
    
    // Get total count for pagination
    db.collection('facts').get()
        .then(countSnapshot => {
            totalFacts = countSnapshot.size;
            addPaginationControls();
        });
}

// Add pagination controls for facts
function addPaginationControls() {
    const totalPages = Math.ceil(totalFacts / factsPerPage);
    
    if (totalPages <= 1) return;
    
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    let paginationHTML = '';
    
    // Previous button
    if (currentFactPage > 1) {
        paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="${currentFactPage - 1}">&lt;</button>`;
    }
    
    // Page numbers
    const maxVisiblePages = 3;
    let startPage = Math.max(1, currentFactPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're at the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Always show first page
    if (startPage > 1) {
        paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentFactPage) {
            paginationHTML += `<button class="btn btn-sm btn-space pagination-btn active" data-page="${i}">${i}</button>`;
        } else {
            paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="${i}">${i}</button>`;
        }
    }
    
    // Always show last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // Next button
    if (currentFactPage < totalPages) {
        paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="${currentFactPage + 1}">&gt;</button>`;
    }
    
    pagination.innerHTML = paginationHTML;
    
    // Add event listeners
    pagination.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFactPage = parseInt(e.target.dataset.page);
            loadFacts();
        });
    });
    
    spaceFacts.appendChild(pagination);
}

// Display a fact
function displayFact(fact) {
    const factElement = document.createElement('div');
    factElement.className = 'fact-item';
    factElement.innerHTML = `
        <p ${currentUser ? 'contenteditable="true"' : ''}>${fact.text}</p>
        ${currentUser ? `
        <div class="fact-controls">
            <button class="btn btn-sm btn-space save-fact" data-id="${fact.id}">Save</button>
            <button class="btn btn-sm btn-danger delete-fact" data-id="${fact.id}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        ` : ''}
    `;
    
    if (currentUser && fact.id !== 'default') {
        factElement.querySelector('.save-fact').addEventListener('click', () => saveFact(fact.id));
        factElement.querySelector('.delete-fact').addEventListener('click', () => deleteFact(fact.id));
    }
    
    spaceFacts.appendChild(factElement);
}

// Add a new fact
function addFact() {
    const text = document.getElementById('factInput').value.trim();
    
    if (!text) {
        showAlert('Error', 'Please enter a fact', 'error');
        return;
    }
    
    db.collection('facts').add({
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        bootstrap.Modal.getInstance(document.getElementById('addFactModal')).hide();
        document.getElementById('factInput').value = '';
        loadFacts();
        showAlert('Fact Added!', '', 'success', 1500);
    })
    .catch(error => {
        showAlert('Error', error.message, 'error');
    });
}

// Save edited fact
function saveFact(factId) {
    const factElement = document.querySelector(`.delete-fact[data-id="${factId}"]`).closest('.fact-item');
    const text = factElement.querySelector('p').textContent;
    
    db.collection('facts').doc(factId).update({
        text,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showAlert('Saved!', 'Fact updated successfully', 'success', 1500);
    })
    .catch(error => {
        showAlert('Error', error.message, 'error');
    });
}

// Delete a fact
function deleteFact(factId) {
    Swal.fire({
        title: 'Delete Fact?',
        text: 'Are you sure you want to delete this space fact?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        background: '#0e1238',
        color: '#fff',
        confirmButtonColor: '#ff4d4d',
    }).then((result) => {
        if (result.isConfirmed) {
            db.collection('facts').doc(factId).delete()
                .then(() => {
                    document.querySelector(`.delete-fact[data-id="${factId}"]`).closest('.fact-item').remove();
                    showAlert('Deleted!', 'Fact removed', 'success', 1500);
                    loadFacts(); // Reload to update pagination
                })
                .catch(error => {
                    showAlert('Error', error.message, 'error');
                });
        }
    });
}

// Load image gallery with pagination
function loadGallery() {
    imageGallery.innerHTML = '<div class="text-center"><div class="spinner-border text-primary"></div></div>';
    
    // First get the total count
    db.collection('gallery').get()
        .then(countSnapshot => {
            totalGalleryImages = countSnapshot.size;
            
            // Then get the paginated data
            return db.collection('gallery')
                .orderBy('createdAt', 'desc')
                .limit(galleryPerPage)
                .get();
        })
        .then(querySnapshot => {
            imageGallery.innerHTML = '';
            
            if (querySnapshot.empty) {
                imageGallery.innerHTML = '<p class="text-center">No images yet. Upload your first space image!</p>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const image = doc.data();
                image.id = doc.id;
                displayGalleryImage(image);
            });
            
            // Add pagination controls
            addGalleryPaginationControls();
            
            // Add click handlers for gallery images
            document.querySelectorAll('.gallery-image').forEach(img => {
                img.addEventListener('click', (e) => {
                    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
                    document.getElementById('modalImage').src = e.target.src;
                    document.getElementById('modalCaption').textContent = e.target.alt;
                    modal.show();
                });
            });
        })
        .catch(error => {
            console.error("Error loading gallery:", error);
            imageGallery.innerHTML = '<p class="text-center text-danger">Error loading gallery</p>';
        });
}

// Add pagination controls for gallery
function addGalleryPaginationControls() {
    const totalPages = Math.ceil(totalGalleryImages / galleryPerPage);
    
    if (totalPages <= 1) return;
    
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    let paginationHTML = '';
    
    // Previous button
    if (currentGalleryPage > 1) {
        paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="${currentGalleryPage - 1}">&lt;</button>`;
    }
    
    // Page numbers
    const maxVisiblePages = 3;
    let startPage = Math.max(1, currentGalleryPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're at the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Always show first page
    if (startPage > 1) {
        paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }
    
    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentGalleryPage) {
            paginationHTML += `<button class="btn btn-sm btn-space pagination-btn active" data-page="${i}">${i}</button>`;
        } else {
            paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="${i}">${i}</button>`;
        }
    }
    
    // Always show last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // Next button
    if (currentGalleryPage < totalPages) {
        paginationHTML += `<button class="btn btn-sm btn-space pagination-btn" data-page="${currentGalleryPage + 1}">&gt;</button>`;
    }
    
    pagination.innerHTML = paginationHTML;
    
    // Add event listeners
    pagination.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentGalleryPage = parseInt(e.target.dataset.page);
            loadGallery();
        });
    });
    
    imageGallery.appendChild(pagination);
}

// Display gallery image
function displayGalleryImage(image) {
    const imageElement = document.createElement('div');
    imageElement.className = 'gallery-item';
    imageElement.innerHTML = `
        <img src="${image.url}" class="gallery-image" alt="${image.caption || 'Space Image'}" 
             data-bs-toggle="modal" data-bs-target="#imageModal" data-img="${image.url}">
        <div class="image-caption-container">
            <p class="image-caption" ${currentUser ? 'contenteditable="true"' : ''}>${image.caption || 'Space Image'}</p>
            ${currentUser ? `
            <div class="gallery-controls">
                <button class="btn btn-sm btn-space save-caption" data-id="${image.id}">Save</button>
                <button class="btn btn-sm btn-danger delete-image" data-id="${image.id}" data-path="${image.path}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            ` : ''}
        </div>
    `;
    
    if (currentUser) {
        imageElement.querySelector('.save-caption').addEventListener('click', () => saveImageCaption(image.id));
        imageElement.querySelector('.delete-image').addEventListener('click', () => 
            deleteImage(image.id, image.path));
    }
    
    imageGallery.appendChild(imageElement);
}

// Upload image to gallery
async function uploadImage() {
    const fileInput = document.getElementById('galleryImageUpload');
    const caption = document.getElementById('imageCaptionInput').value.trim();
    
    if (!fileInput.files[0]) {
        showAlert('Error', 'Please select an image to upload', 'error');
        return;
    }
    
    try {
        const file = fileInput.files[0];
        // Compress the image before uploading
        const compressedBlob = await compressImage(file);
        const storageRef = storage.ref(`gallery/${Date.now()}_${file.name}`);
        
        // Put the compressed file in storage
        const uploadTask = storageRef.put(compressedBlob);
        
        await uploadTask;
        const url = await storageRef.getDownloadURL();
        
        const imageData = {
            url: url,
            caption: caption || 'My Space Image',
            path: uploadTask.snapshot.ref.fullPath,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('gallery').add(imageData);
        
        bootstrap.Modal.getInstance(document.getElementById('uploadImageModal')).hide();
        fileInput.value = '';
        document.getElementById('imageCaptionInput').value = '';
        
        // Reset to first page after upload
        currentGalleryPage = 1;
        loadGallery();
        
        showAlert('Uploaded!', 'Image added to gallery', 'success', 1500);
    } catch (error) {
        console.error("Error uploading image:", error);
        showAlert('Error', 'Image upload failed', 'error');
    }
}

// Save image caption
function saveImageCaption(imageId) {
    const imageElement = document.querySelector(`.delete-image[data-id="${imageId}"]`).closest('.gallery-item');
    const caption = imageElement.querySelector('.image-caption').textContent;
    
    db.collection('gallery').doc(imageId).update({
        caption,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        showAlert('Saved!', 'Caption updated', 'success', 1500);
    })
    .catch(error => {
        showAlert('Error', error.message, 'error');
    });
}

// Delete image from gallery
function deleteImage(imageId, imagePath) {
    Swal.fire({
        title: 'Delete Image?',
        text: 'Are you sure you want to delete this image?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        background: '#0e1238',
        color: '#fff',
        confirmButtonColor: '#ff4d4d',
    }).then((result) => {
        if (result.isConfirmed) {
            // Delete from Firestore
            db.collection('gallery').doc(imageId).delete()
                .then(() => {
                    // Delete from storage
                    return storage.ref(imagePath).delete();
                })
                .then(() => {
                    // Check if we need to go back a page
                    const remainingImages = totalGalleryImages - 1;
                    const currentPageCount = Math.ceil(remainingImages / galleryPerPage);
                    if (currentGalleryPage > currentPageCount) {
                        currentGalleryPage = currentPageCount;
                    }
                    
                    loadGallery();
                    showAlert('Deleted!', 'Image removed', 'success', 1500);
                })
                .catch(error => {
                    showAlert('Error', error.message, 'error');
                });
        }
    });
}

// Change theme
function saveThemeSelection() {
    const selectedTheme = document.querySelector('.theme-option.selected');
    if (!selectedTheme) {
        showAlert('No Theme Selected', 'Please select a theme first', 'error');
        return;
    }
    
    const theme = selectedTheme.dataset.theme;
    let color = userData.color;
    
    if (theme === 'custom') {
        color = document.getElementById('customThemeColor').value;
    }
    
    // Apply theme to all users
    applyTheme(theme, color);
    
    // Get the modal instance
    const themeModal = bootstrap.Modal.getInstance(document.getElementById('themeModal'));
    
    // Properly hide the modal
    themeModal.hide();
    
    const themeName = selectedTheme.querySelector('p').textContent;
    showAlert('Theme Applied!', `${themeName} theme is now active for all users`, 'success', 1500);
}

// Apply theme
function applyTheme(theme, color = '#4d79ff') {
    let primaryColor = color;
    let bgGradient = '';
    
    switch (theme) {
        case 'mars':
            primaryColor = '#ff4d4d';
            bgGradient = 'linear-gradient(135deg, #2a0a0a 0%, #4a1a1a 50%, #ff4d4d 100%)';
            break;
        case 'nebula':
            primaryColor = '#9d4dff';
            bgGradient = 'linear-gradient(135deg, #1a0a2a 0%, #3a1a5a 50%, #9d4dff 100%)';
            break;
        case 'alien':
            primaryColor = '#4dff4d';
            bgGradient = 'linear-gradient(135deg, #0a2a0a 0%, #1a4a1a 50%, #4dff4d 100%)';
            break;
        case 'sun':
            primaryColor = '#ffff4d';
            bgGradient = 'linear-gradient(135deg, #2a2a0a 0%, #4a4a1a 50%, #ffff4d 100%)';
            break;
        case 'custom':
            primaryColor = color;
            bgGradient = `linear-gradient(135deg, #0a0a2a 0%, #1a1a4a 50%, ${color} 100%)`;
            break;
        default: // default space theme
            primaryColor = '#4d79ff';
            bgGradient = 'linear-gradient(135deg, #0a0a2a 0%, #1a1a4a 50%, #4d79ff 100%)';
    }
    
    // Update CSS variables
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    
    // Update theme in site settings (for all users)
    db.collection('settings').doc('site').update({
        theme: theme,
        color: primaryColor,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        // Update local user data if logged in
        if (currentUser) {
            db.collection('users').doc(currentUser.uid).update({
                theme: theme,
                color: primaryColor,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });
    
    // Apply to elements
    document.querySelectorAll('.btn-space').forEach(btn => {
        btn.style.backgroundColor = primaryColor;
        btn.style.boxShadow = `0 0 10px ${hexToRgba(primaryColor, 0.5)}`;
    });
    
    document.querySelectorAll('.space-widget, .space-header').forEach(el => {
        el.style.borderColor = primaryColor;
    });
    
    document.querySelectorAll('.space-widget h3, .space-header h1').forEach(el => {
        el.style.color = primaryColor;
        if (el.tagName === 'H3') {
            el.style.borderColor = primaryColor;
        }
    });
}

// Add this function to initialize theme previews
function initializeThemePreviews() {
    document.querySelectorAll('.theme-option').forEach(option => {
        const theme = option.dataset.theme;
        const color = option.dataset.color;
        const preview = option.querySelector('.theme-preview');
        
        let bgGradient = '';
        
        switch (theme) {
            case 'mars':
                bgGradient = 'linear-gradient(135deg, #2a0a0a 0%, #4a1a1a 50%, #ff4d4d 100%)';
                break;
            case 'nebula':
                bgGradient = 'linear-gradient(135deg, #1a0a2a 0%, #3a1a5a 50%, #9d4dff 100%)';
                break;
            case 'alien':
                bgGradient = 'linear-gradient(135deg, #0a2a0a 0%, #1a4a1a 50%, #4dff4d 100%)';
                break;
            case 'sun':
                bgGradient = 'linear-gradient(135deg, #2a2a0a 0%, #4a4a1a 50%, #ffff4d 100%)';
                break;
            case 'custom':
                bgGradient = `linear-gradient(135deg, #0a0a2a 0%, #1a1a4a 50%, ${color} 100%)`;
                break;
            default: // default space theme
                bgGradient = 'linear-gradient(135deg, #0a0a2a 0%, #1a1a4a 50%, #4d79ff 100%)';
        }
        
        preview.style.background = bgGradient;
    });
}

// Helper function to show alerts
function showAlert(title, text, icon, timer = null) {
    const options = {
        title,
        text,
        icon,
        background: '#0e1238',
        color: '#fff',
        confirmButtonColor: '#4d79ff',
    };
    
    if (timer) {
        options.timer = timer;
        options.showConfirmButton = false;
    }
    
    Swal.fire(options);
}

// Convert hex to rgba
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Fix for all modal close events
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('hidden.bs.modal', function () {
        document.body.classList.remove('modal-open');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
    });
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);