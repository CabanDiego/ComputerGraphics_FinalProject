export function setupWinScreen(onRetryCallback) {
    //Create win screen
    const winScreen = document.createElement('div');
    winScreen.id = 'winScreen';
    winScreen.style.display = 'none';
    winScreen.innerHTML = `
        <button id="winRetryButton">Play Again</button>
    `;

    Object.assign(winScreen.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        backgroundImage: 'url("images/winScreen.png")',
        backgroundSize: '70% auto',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '2rem',
        zIndex: '9999'
    });

    const winRetryButton = winScreen.querySelector('#winRetryButton');
    Object.assign(winRetryButton.style, {
        background: 'linear-gradient(to bottom, #4fc3ff, #007bff)',
        color: 'white',
        border: 'none',
        borderRadius: '25px',
        padding: '15px 50px',
        fontSize: '2rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
        textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        marginTop: '220px'
    });

    winRetryButton.addEventListener('mouseover', () => {
        winRetryButton.style.backgroundColor = '#0056b3';
        winRetryButton.style.transform = 'scale(1.05)';
    });
    winRetryButton.addEventListener('mouseout', () => {
        winRetryButton.style.backgroundColor = '#007BFF';
        winRetryButton.style.transform = 'scale(1)';
    });
    winRetryButton.addEventListener('click', () => {
        winScreen.style.display = 'none';
        if (onRetryCallback) onRetryCallback();
    });

    document.body.appendChild(winScreen);

    return {
        show: () => winScreen.style.display = 'flex',
        hide: () => winScreen.style.display = 'none'
    };
}
