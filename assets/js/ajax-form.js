$(function() {

	// Get the form.
	var form = $('#contact-form');

	// Get the messages div.
	var formMessages = $('.ajax-response');

	// Set up an event listener for the contact form.
	$(form).submit(function(e) {
		// Stop the browser from submitting the form.
		e.preventDefault();

		// Serialize the form data.
		var formData = $(form).serialize();

		// Submit the form using AJAX.
		$.ajax({
			type: 'POST',
			url: $(form).attr('action'),
			data: formData
		})
		.done(function(response) {
			// Support both JSON and plain-text responses
			try {
				if (typeof response === 'string') {
					var trimmed = response.trim();
					if (trimmed && (trimmed[0] === '{' || trimmed[0] === '[')) {
						response = JSON.parse(trimmed);
					}
				}
			} catch (e) {
				// ignore parse errors
			}

			var messageText = response && response.message ? response.message : response;
			if (typeof messageText !== 'string') messageText = 'Thank you! Your message has been sent.';

			// Make sure that the formMessages div has the 'success' class.
			$(formMessages).removeClass('error');
			$(formMessages).addClass('success');

			// Set the message text.
			$(formMessages).text(messageText);

			// Clear the form.
			if (form && form.length && form[0] && typeof form[0].reset === 'function') {
				form[0].reset();
			} else {
				$('#contact-form input,#contact-form textarea').val('');
			}
		})
		.fail(function(data) {
			// Make sure that the formMessages div has the 'error' class.
			$(formMessages).removeClass('success');
			$(formMessages).addClass('error');

			// Network / blocked request (often happens when opening the HTML via file://)
			if (data && (data.status === 0 || data.readyState === 0)) {
				$(formMessages).text('Cannot reach the server. If you are previewing this site via file://, please run it on a web server (or deploy to Vercel) and try again.');
				return;
			}

			// Set the message text.
			var errText = '';
			try {
				if (data && data.responseText) {
					var t = String(data.responseText).trim();
					if (t && (t[0] === '{' || t[0] === '[')) {
						var parsed = JSON.parse(t);
						errText = parsed.error || parsed.message || t;
					} else {
						errText = t;
					}
				}
			} catch (e) {
				errText = data && data.responseText ? data.responseText : '';
			}

			if (errText) {
				$(formMessages).text(errText);
			} else {
				$(formMessages).text('Oops! An error occured and your message could not be sent.');
			}
		});
	});

});
