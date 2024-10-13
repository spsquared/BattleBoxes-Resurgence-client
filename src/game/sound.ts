const audioContext = new AudioContext();
const globalVolume = audioContext.createGain();
globalVolume.connect(audioContext.destination);

if (navigator.userActivation) {
    const waitForInteraction = setInterval(() => {
        if (navigator.userActivation.hasBeenActive) {
            audioContext.resume();
            clearInterval(waitForInteraction);
        }
    }, 100);
} else {
    document.addEventListener('click', function click() {
        document.removeEventListener('click', click);
        audioContext.resume();
    });
}