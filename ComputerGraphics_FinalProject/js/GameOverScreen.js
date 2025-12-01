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

    const h1 = gameOverScreen.querySelector('h1');
        Object.assign(h1.style, {
        fontSize: '5rem',       
        fontWeight: 'bold',     
        color: 'yellow',       
        textShadow: '5px 2px 4px black' 
    }); 
    document.body.appendChild(gameOverScreen);

    //Retry button
    const retryButton = document.getElementById('retryButton');
    Object.assign(retryButton.style, {
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
    retryButton.addEventListener('mouseover', () => {
        retryButton.style.backgroundColor = '#0056b3';
        retryButton.style.transform = 'scale(1.05)';
    });
    retryButton.addEventListener('mouseout', () => {
        retryButton.style.backgroundColor = '#007BFF';
        retryButton.style.transform = 'scale(1)';
    });
    retryButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        if (onRetryCallback) onRetryCallback();
    });

    return {
        show: () => gameOverScreen.style.display = 'flex',
        hide: () => gameOverScreen.style.display = 'none'
    };
}
