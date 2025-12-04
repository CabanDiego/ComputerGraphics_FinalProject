export function setupLoadingScreen(onStartCallback) {
    //Create loading screen first
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loadingScreen';
    loadingScreen.innerHTML = `<h1>Loading...</h1>`;
    Object.assign(loadingScreen.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '2rem',
        zIndex: '9999',
        flexDirection: 'column',
        background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("images/loadBackground.jpg")',
        backgroundSize: 'cover',       
        backgroundPosition: 'center',  
        backgroundRepeat: 'no-repeat'  
    });
    document.body.appendChild(loadingScreen);

    //Function to call when Ammo/game is ready
    function onReady() {
        //Remove loading screen
        document.body.removeChild(loadingScreen);

        //Create start screen 
        const startScreen = document.createElement('div');
        startScreen.id = 'startScreen';
        startScreen.innerHTML = `<h1>Ready to Play</h1><button id="startButton">START</button> 
        <div id="controlsLabel">Use Arrow Keys to Play</div>
        <img id="controlsImage" src="images/arrowKeys.png"></img>`;
        Object.assign(startScreen.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '2rem',
            zIndex: '9999',
            flexDirection: 'column',
            background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("images/loadBackground.jpg")',
            backgroundSize: 'cover',       
            backgroundPosition: 'center',  
            backgroundRepeat: 'no-repeat'
        });

        const h1 = startScreen.querySelector('h1');
            Object.assign(h1.style, {
            fontSize: '7rem',       
            fontWeight: 'bold',     
            color: 'yellow',       
            textShadow: '5px 2px 4px black' 
        }); 
        document.body.appendChild(startScreen);

        const controlsLabel = document.getElementById("controlsLabel");
        Object.assign(controlsLabel.style, {
            position: "absolute",
            bottom: "130px",  
            right: "20px", 
            color: "white",
            fontSize: "1.6rem",
            fontWeight: "bold",
            fontFamily: "Arial Black",
            textShadow: "2px 2px 4px black",
            pointerEvents: "none",
        });

        const controlsImage = document.getElementById("controlsImage");
        Object.assign(controlsImage.style, {
            position: "absolute",
            bottom: "20px",
            right: "100px",
            width: "170px",  
            opacity: "0.9",
            pointerEvents: "none" 
        });
        

        //Add button click
        const startButton = document.getElementById('startButton');
        Object.assign(startButton.style, {
            background: 'linear-gradient(to bottom, #4fc3ff, #007bff)', // glossy gradient
            color: 'white',
            border: 'none',
            borderRadius: '25px',        
            padding: '15px 50px',       
            fontSize: '2rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
            textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s, box-shadow 0.2s'
        });

        //Hover effect
        startButton.addEventListener('mouseover', () => {
            startButton.style.backgroundColor = '#0056b3';
            startButton.style.transform = 'scale(1.05)';
        });
        startButton.addEventListener('mouseout', () => {
            startButton.style.backgroundColor = '#007BFF';
            startButton.style.transform = 'scale(1)';
        });

        //Add click
        startButton.addEventListener('click', () => {
            //Remove start screen   
            document.body.removeChild(startScreen);
            if (onStartCallback) onStartCallback();
        });
    }
    return onReady;
}
