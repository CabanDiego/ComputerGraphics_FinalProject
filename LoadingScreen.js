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
        flexDirection: 'column'
    });
    document.body.appendChild(loadingScreen);

    //Function to call when Ammo/game is ready
    function onReady() {
        //Remove loading screen
        document.body.removeChild(loadingScreen);

        //Create start screen 
        const startScreen = document.createElement('div');
        startScreen.id = 'startScreen';
        startScreen.innerHTML = `<h1>Ready to Play</h1><button id="startButton">Start Game</button>`;
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
            flexDirection: 'column'
        });
        document.body.appendChild(startScreen);

        //Add button click
        const startButton = document.getElementById('startButton');
        startButton.addEventListener('click', () => {
            //Remove start screen
            document.body.removeChild(startScreen);
            if (onStartCallback) onStartCallback();
        });
    }

    return onReady;
}
