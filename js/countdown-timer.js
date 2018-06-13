(function() {

    // Variables to use later
    var root = document.documentElement;
    var container = document.querySelector('.container');
    var button = document.querySelector('.button');
    var counter = document.querySelector('.counter');
    var running = false;
    var timer = null;
    var seconds = 0;
    var secondsInitial = 0;

    // Initializing the slider
    var ms = new MomentumSlider({
        el: container,  // HTML element to append the slider
        range: [1, 60], // Generar los elementos del slider usando el rango de números definido
        loop: 2,        // Hacer infinito el slider, añadiendo 2 elementos extra en cada extremo
        style: {
            // Estilos para interpolar
            // El primer valor corresponde a los elementos adyacentes
            // El segundo valor corresponde al elemento actual
            transform: [{scale: [0.4, 1]}],
            opacity: [0.3, 1]
        }
    });

    // Simple toggle functionality
    button.addEventListener('click', function () {
        if (running) {
            stop();
        } else {
            start();
        }
        running = !running;
    });

    // Start the countdown
    function start() {
        // Disable the slider during countdown
        ms.disable();
        // Get current slide index, and set initial values
        seconds = ms.getCurrentIndex() + 1;
        counter.innerText = secondsInitial = seconds;
        root.style.setProperty('--progress', 0);
        // Add class to trigger CSS transitions for `running` state
        container.classList.add('container--running');
        // Set interval to update the component every second
        timer = setInterval(function () {
            // Update values
            counter.innerText = --seconds;
            root.style.setProperty('--progress', (secondsInitial - seconds) / secondsInitial * 100);
            // Stop countdown if it's finished
            if (!seconds) {
                stop();
                running = false;
            }
        }, 1000);
    }

    // Stop the countdown
    function stop() {
        // Enable slider
        ms.enable();
        // Clear interval
        clearInterval(timer);
        // Reset progress
        root.style.setProperty('--progress', 100);
        // Remove `running` state
        container.classList.remove('container--running');
    }

})();
