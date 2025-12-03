export function setupGameOverScreen(onRetryCallback) {
    //Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'gameOverScreen';
    gameOverScreen.style.display = 'none';
    gameOverScreen.innerHTML = 
        `<h1>Ball is Off the Map!</h1>
        <button id="retryButton">Play Again</button>`;
    
    Object.assign(gameOverScreen.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '2rem',
        zIndex: '9999',
        flexDirection: 'column'
    });

    document.body.appendChild(gameOverScreen);

    //Retry button
    const retryButton = document.getElementById('retryButton');
    retryButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        if (onRetryCallback) onRetryCallback();
    });

    return {
        show: () => gameOverScreen.style.display = 'flex',
        hide: () => gameOverScreen.style.display = 'none'
    };
}
