window.addEventListener("DOMContentLoaded", (event) => {
    const loginForm = document.querySelector('#wf-form-Sign-In-2');
    function handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const loginData = {
            email: formData.get('Email-Field-02'),
            password: formData.get('Password-Field-02')
        };

        fetch(`http://127.0.0.1:8080/api/learners/login`,{  
            headers: {
                "Content-Type": "application/json",
            },
            method: 'POST', 
            body: JSON.stringify(loginData),
            credentials: 'include'
        })
        .then((response) => {
            if(response.status == 401) {
                console.log('Invalid credentials!');
            } else {
                // localStorage.setItem('loggedIn', 'true');
                sessionStorage.setItem('loggedIn', 'true');
                // TODO: Redirect to previous page
                updateLoginButton();
                // loginForm.reset();
                fetchUserCourses();
            }
        })
        .catch((err) => {
            console.log(err.message);
        });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleSubmit);
    }

    const path = window.location.pathname;
    
    // Check the current page and execute the corresponding function
    if (path.includes('lessons')) {
        fetchLessonDetails();
    } else if (path.includes('course')) {
        prepareCoursePage();
    }
});

function updateLoginButton() {
    const loginButton = document.querySelector('#login-button');
    loginButton.innerHTML = 'Logout';
}

function fetchUserCourses() {
    const courseElementList = document.querySelectorAll('.my-course');
    const learnerId = '2ca5d199-d1bb-478d-8f0b-c9aca668c013';
    const authorId = 'ecc2530f-e1de-4aed-9302-7d85034d87bf';
    fetch(`http://127.0.0.1:8080/api/learners/${learnerId}/enrollments?authorId=${authorId}`,{ method: 'GET', credentials: 'include'})
        .then((response) => {
            if(response.status == 401) {
                console.log('Invalid credentials!');
            } else {
                return response.json();
            }
        })
        .then((data) => {
            // Converting response to an Array which will later be used as Map for quick retrieval
            const courseMap = new Map(data.map(item => [item.courseId, item.enrollmentId]));
            const mapArray = Array.from(courseMap); 
            sessionStorage.setItem('enrollments', JSON.stringify(mapArray));
            courseElementList.forEach(courseElement => {
                const courseId = courseElement.getAttribute('course-id');
                if(courseMap.has(courseId)) {
                    courseElement.style.display = "block";
                }
            });
        })
        .catch((err) => {
            console.log(err.message);
        });
}

function fetchLessonDetails() {
    const isLoggedIn = sessionStorage.getItem("loggedIn");
    console.log(isLoggedIn);
    // Redirect if user is not logged in
    if(!isLoggedIn) {
        location.replace("/contact");
    }

    // Path contains lessonId as slug
    const path = window.location.pathname;
    const pathParts = path.split('/');
    const lessonId = pathParts[pathParts.length - 1];
    // const lessonId = "986984cd-03fb-450f-ac01-e106d38ee0b1";
    // Check if user has access to course
    fetch(`http://127.0.0.1:8080/api/learners/lessons/${lessonId}`,{ method: 'GET', credentials: 'include'})
    .then((response) => {
        if(response.status == 401){
            location.replace("/contact");
        } else {
            return response.json();
        }
    }).then((lesson) => {
        console.log(lesson);
        const titleElement = document.querySelector("#lesson-title");
        titleElement.innerHTML = lesson.title;

        const textElement = document.querySelector("#lesson-text");
        textElement.innerHTML = lesson.content;

        const buttonElement = document.querySelector("#lesson-buttons");

        embedVideo(lesson.videoURL);

        // Attach logic to Next Lesson button
        const nextLessonButton = document.querySelector('#next-lesson-button');
        nextLessonButton.addEventListener('click', () => navigateToNextLesson(lesson));
    }).catch((err) => {
            console.log(err.message);
    });
}


function embedVideo(videoUrl) {
    const videoContainer = document.querySelector("#lesson-video");
    let iframe;

    if (videoUrl.includes('youtube.com')) {
        // For YouTube full length
        const videoId = videoUrl.split('v=')[1];
        let ampersandPosition = videoId.indexOf('&');
        if (ampersandPosition != -1) {
            videoId = videoId.substring(0, ampersandPosition);
        }
        iframe = `<iframe width="1280" height="720" src="https://www.youtube.com/embed/${videoId}" frameborder="0" scrolling="no" allowfullscreen></iframe>`;
    } else if(videoUrl.includes('youtu.be')) {
        // For YouTube shortened
        const videoId = videoUrl.split('.be/')[1];
        iframe = `<iframe width="1280" height="720" src="https://www.youtube.com/embed/${videoId}" frameborder="0" scrolling="no" allowfullscreen></iframe>`;
    } else if (videoUrl.includes('vimeo.com')) {
        // For Vimeo
        const videoId = videoUrl.split('.com/')[1];
        iframe = `<iframe width="1280" height="720" src="https://player.vimeo.com/video/${videoId}" frameborder="0" scrolling="no" allowfullscreen></iframe>`;
    } else {
        // Other video providers
        iframe = '<p>Unsupported video provider</p>';
    }

    videoContainer.innerHTML = iframe;
}

function moveLessonsIntoModules() {
    const moduleList = document.querySelectorAll('.module');
    const lessonList = document.querySelectorAll('.lesson');

    // Creating a map of modules with moduleId as key
    const moduleMap = new Map();
    moduleList.forEach((module) => {
        const moduleId = module.getAttribute('moduleId');
        moduleMap.set(moduleId, module);
    });

    // Adding each lesson as a child or corresponding module
    lessonList.forEach((lesson) => {
        const moduleId = lesson.getAttribute('moduleId');
        const moduleElement = moduleMap.get(moduleId);
        moduleElement.appendChild(lesson);
    });

}

function prepareCoursePage() {
    const priceSection = document.querySelector("#priceSection");
    const enrollButton = document.querySelector("#enrollButton");
    const isLoggedIn = sessionStorage.getItem("loggedIn");

    const courseTitle = document.querySelector("#courseTitle");
    const courseId = courseTitle.getAttribute("courseId");

    const enrolledList = JSON.parse(sessionStorage.getItem("enrollments"));
    const enrollmentMap = new Map(enrolledList);

    const isEnrolled = enrollmentMap.has(courseId);

    if(isLoggedIn && isEnrolled){
        // Hide price section
        priceSection.style.display = "none";
        // Show lessons and modules which should be hidden by default
        moveLessonsIntoModules();
    } else if(!isLoggedIn) {
        // the button and info remains same, but the URL leads to login page
        enrollButton.href = "/";
    } else {
        // user is logged in but not enrolled, so URL will lead to checkout page
        enrollButton.href = "/checkout"
    }
}

function signupForm() {
    const signupForm = document.querySelector('#wf-form-Sign-Up-Form');
    function handleSubmit(event) {
        event.preventDefault();
        const formData = new FormData(signupForm);
        const signUpData = {
            firstName: formData.get('Name-Field-01'),
            lastName: formData.get('Name-Field-02'),
            email: formData.get('Email-Field-01'),
            password: formData.get('Password-Field-01')
        };

        fetch(`http://127.0.0.1:8080/api/learners`,{  
            headers: {
                "Content-Type": "application/json",
            },
            method: 'POST', 
            body: JSON.stringify(signUpData),
            credentials: 'include'
        })
        .then((response) => {
            if(response.status == 400) {
                console.log('Missing information!');
            } else if(response.status == 201) {
                // TODO: Redirect to login page
                // signupForm.reset();
            }
        })
        .catch((err) => {
            console.log(err.message);
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSubmit);
    }
}

function navigateToNextLesson(currentLesson) {

    // Get enrollment ID from session storage
    const enrolledList = JSON.parse(sessionStorage.getItem("enrollments"));
    const enrollmentMap = new Map(enrolledList);
    const enrollmentId = enrollmentMap.get(currentLesson.courseId);

    // Find current lesson's index(for completion percentage) and next lesson's slug(for link)
    const slugList = document.querySelectorAll('.lesson-slug');
    
    // const currentLessonSlug = currentLesson.title.trim().replace(/ /g, '-');
    const currentLessonSlug = currentLesson.lessonId;
    
    let nextLessonSlug = null;
    let currentLessonIndex = null;
    let progressPercentage = null;

    slugList.forEach((slugElement, index) => {
        // Check if the text content of the current element matches the currentLessonSlug
        if (slugElement.textContent.trim() === currentLessonSlug) {
            currentLessonIndex = index + 1;
            // Check if there is a next element in the list (next sibling)
            if (slugList[index + 1]) {
                // Get the next element's text content
                nextLessonSlug = slugList[index + 1].textContent.trim();
            }
        }
    });

    if(currentLessonIndex) {
        progressPercentage = (currentLessonIndex / slugList.length) * 100;
    }

    // Update progress by calling API
    const progressData = {
        enrollmentId: enrollmentId,
        lastLessonId: currentLesson.lessonId,
        lastModuleId: currentLesson.moduleId,
        progressPercentage: progressPercentage
    };
    fetch(`http://127.0.0.1:8080/api/progress/${enrollmentId}`, {
        headers: {
            "Content-Type": "application/json",
        },
        method: 'PUT', 
        body: JSON.stringify(progressData),
        credentials: 'include'
    }).catch(/* TODO: Logic in case of error */);    

    // If nextLessonSlug is found, navigate to next lesson
    if (nextLessonSlug) {
        const currentUrl = window.location.href;
        // const currentPath = window.location.pathname;

        const urlWithoutSlug = currentUrl.substring(0, currentUrl.lastIndexOf('/')); 

        // Construct the new URL by appending the new slug
        const newUrl = urlWithoutSlug + '/' + nextLessonSlug;

        // Redirect to next lesson
        window.location.href = newUrl;
    } else {
        // Navigate to finish page
    }
}
