document.getElementById('predictor-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const inputField = document.getElementById('user-input');
    const submitButton = event.target.querySelector('button');
    const loader = document.getElementById('loader');
    const result = document.getElementById('result');

    // Disable the button after the first click
    submitButton.disabled = true;

    // Show the loader
    loader.classList.remove('hidden');
    result.classList.add('hidden'); // Hide previous result

    // Simulate a loading delay
    setTimeout(() => {
        // Hide the loader
        loader.classList.add('hidden');

        // Randomly predict "Big" or "Small"
        const prediction = Math.random() < 0.5 ? 'Big' : 'Small';
        
        // Show the result
        result.textContent = prediction;
        result.classList.remove('hidden');

        // Enable the button again after displaying the result
        inputField.value = ''; // Clear the input
        submitButton.disabled = false; // Re-enable the button
        inputField.focus(); // Focus back on the input field
    }, 2000); // 2 seconds delay
});
