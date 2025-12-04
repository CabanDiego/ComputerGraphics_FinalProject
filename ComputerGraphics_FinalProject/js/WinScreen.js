export function setupWinScreen(onRetryCallback) {
    //Create game over screen
    const winScreen = document.createElement('div');
    winScreen.id = 'winScreen';
    winScreen.style.display = 'none';
    winScreen.innerHTML = ``;
    
    Object.assign(winScreen.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        backgroundImage: 'url("images/winScreen.jpg")',
        backgroundSize: '70% auto',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
    });
    document.body.appendChild(winScreen);
    
    return {
        show: () => winScreen.style.display = 'flex',
        hide: () => winScreen.style.display = 'none'
    };
}

