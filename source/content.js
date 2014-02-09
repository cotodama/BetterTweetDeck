var options;
chrome.extension.sendRequest({}, function(response) {
	setAllTheSettings(response);
});

function setAllTheSettings(response) {
	options = response;
	// Handling the old true/false strings in options
	for(var key in options) {
		if(options.hasOwnProperty(key)) {
			if(options[key] == "true") options[key] = true;
			if(options[key] == "false") options[key] = false;
		}
	}
	bodyClasses = document.body.classList;
	document.body.addEventListener("DOMNodeInserted", eventDispatcher);
	if(options.circled_avatars == true) {
		bodyClasses.add("btd-circle-avatars");
	}
	if(options.reduced_padding == true) {
		bodyClasses.add("btd-reduced-padding");
	}
	if(options.no_columns_icons == true) {
		bodyClasses.add("btd-no-columns-icons");
	}
	if(options.grayscale_notification_icons == true) {
		bodyClasses.add("btd-grayscale-notification-icons");
	}
}

function eventDispatcher() {
	// If the event.target is the text (TweetDeck updates timestamp at regular intervals) then we can get the .txt-mute element and tweak it in real-time
	if(event.relatedNode.className.indexOf("txt-mute") != -1 && options.timestamp != "relative") {
		timeIsNotRelative(event.relatedNode, options.timestamp);
	} 
	// If it's not a .txt-mute element, it must be a tweet or something similar, let's check it !
	else if(event.target.className && event.target.className.indexOf("stream-item") != -1) {

		// Applying the timestamp
		if(options.timestamp != "relative") {
			if(event.target.querySelector("time")){
				timeIsNotRelative(event.target.querySelector("time > *"), options.timestamp);
			}
		}

		// Tweaking the name displaying
		nameDisplay(event.target.querySelectorAll("a[rel='user']:not(.item-img)"), options.name_display);
		
		// If asked, removing t.co links
		if(options.url_redirection == true){
			useFullUrl(event.target);
		}

		// If asked, creating the non-pic.twitter image previews
		if(options.img_preview != false){
			links = event.target.querySelectorAll("p > a[data-full-url]");
			if(links.length > 0) {
			isDetail = links[0].parentNode.parentNode.querySelectorAll(".js-cards-container").length != 0;
			imgURL = links[0].getAttribute("data-full-url");
				if((imgURL.indexOf("imgur.com/") != -1 && imgURL.indexOf("/?q") == -1) && options.img_preview_imgur == true){
					createPreviewDiv(links[0],"imgur");
				} else if(imgURL.indexOf("d.pr/i") != -1 && options.img_preview_droplr == true) {
					if(isDetail == false) createPreviewDiv(links[0],"droplr");
				} else if(imgURL.indexOf("cl.ly/") != -1 && options.img_preview_cloud == true) {
					if(isDetail == false) createPreviewDiv(links[0],"cloudApp");
				} else if(imgURL.indexOf("instagram.com/") != -1 && options.img_preview_instagram == true) {
					createPreviewDiv(links[0],"instagram");
				} else if((imgURL.indexOf("flic.kr/") != -1 || imgURL.indexOf("flickr.com/") != -1) && options.img_preview_flickr == true){
					if(isDetail == false) createPreviewDiv(links[0],"flickr")
				} else if(imgURL.indexOf("500px.com/") != -1 && options.img_preview_500px == true) {
					if(isDetail == false) createPreviewDiv(links[0],"fivehundredpx");
				} else if(imgURL.indexOf("media.tumblr.com/") != -1 && options.img_preview_tumblr == true) {
					createPreviewDiv(links[0],"tumblr");
				}
			}
		}

		if(options.yt_rm_button == true) {
			var preview = event.target.querySelector("div.video-overlay.icon-with-bg-round");

			if(preview != null) {
				preview.style.display = "none";
			}
		}
	} else if(event.relatedNode.classList.contains("typeahead")) {
		if(options.typeahead_display_username_only == true) {
			for (var i = event.relatedNode.querySelectorAll("strong.fullname").length - 1; i >= 0; i--) {
				event.relatedNode.querySelectorAll("strong.fullname")[i].remove();
			};
			for (var i = event.relatedNode.querySelectorAll("span.username").length - 1; i >= 0; i--) {
				event.relatedNode.querySelectorAll("span.username")[i].style.fontWeight= "bold";
				event.relatedNode.querySelectorAll("span.username")[i].classList.add("fullname");
				event.relatedNode.querySelectorAll("span.username")[i].classList.remove("username");
			};
		}
	}
}

function createPreviewDiv(element, provider) {
	// Getting the full URL for later
	linkURL = element.getAttribute("data-full-url");
	thumbSize = options.img_preview;
	if(provider == "imgur") {
		// Settings up some client-ID to "bypass" the request rate limite (12,500 req/day/client)
		imgurClientIDs = ["c189a7be5a7a313","180ce538ef0dc41"];
		function getClientID() {
			return imgurClientIDs[Math.floor(Math.random() * imgurClientIDs.length)];
		}
		// Setting the right suffix depending of the user's option
		if(thumbSize == "small") suffixImgur = "t";
		if(thumbSize == "medium") suffixImgur = "m";
		if(thumbSize == "large") suffixImgur = "l";
		imgurID = linkURL.split("/").pop().split(".").pop();
		// If it's an album or a gallery take this route !
		if(linkURL.indexOf("/a/") != -1) {
			// Using jQuery's AJAX library to do the magic
			$.ajax({
				// Sidenote, even if Imgur got different models for album and gallery, they share the same API url so, why bother ?
				url: "https://api.imgur.com/3/album/"+imgurID,
				type: 'GET',
				dataType: 'json',
				// Plz don't steal this data, anyone can create an Imgur app so be fair !
				headers: {"Authorization": "Client-ID "+getClientID()}
			})
			.done(function(data) {
				// Make the thumbnail URL with suffix and the ID of the first images in the album/gallery
				thumbnailUrl = "https://i.imgur.com/"+data.data.cover+suffixImgur+".jpg";
				continueCreatingThePreview(thumbnailUrl)
			});
		} else if(linkURL.indexOf("/gallery/") != -1) {
			// Using jQuery's AJAX library to do the magic
			$.ajax({
				// Sidenote, even if Imgur got different models for album and gallery, they share the same API url so, why bother ?
				url: "https://api.imgur.com/3/gallery/image/"+imgurID,
				type: 'GET',
				dataType: 'json',
				// Plz don't steal this data, anyone can create an Imgur app so be fair !
				headers: {"Authorization": "Client-ID "+getClientID()}
			})
			.done(function(data) {
				// If the request succeeds, it's a single image with a /gallery/ link
				if(data.success == true) {
					thumbnailUrl = "https://i.imgur.com/"+data.data.id+suffixImgur+".jpg";
					continueCreatingThePreview(thumbnailUrl)
				} else {
					// If the request fails, then it's a gallery album, therefore we have to do another request
					$.ajax({
						url: "https://api.imgur.com/3/gallery/album/"+imgurID,
						type: 'GET',
						dataType: 'json',
						// Plz don't steal this data, anyone can create an Imgur app so be fair !
						headers: {"Authorization": "Client-ID "+getClientID()}
					})
					.done(function() {
						thumbnailUrl = "https://i.imgur.com/"+data.data.id+suffixImgur+".jpg";
						continueCreatingThePreview(thumbnailUrl);
					});
					
				}
			});
		} else {
			// Imgur supported extensions (from http://imgur.com/faq#types)
			continueCreatingThePreview("https://i.imgur.com/"+imgurID+suffixImgur+".jpg");
		}
	} else if(provider == "droplr") {

		// Depending of the thumbSize option we're getting d.pr/i/1234/small or d.pr/i/1234/medium (it seems like Droplr hasn't a "large" option)
		if(thumbSize == "small") {
			suffixDroplr = thumbSize;
		} else {
			suffixDroplr = "medium";
		}
		// Removing the last "/" if present and adding one+suffix
		thumbnailUrl = linkURL.replace(/\/$/,"");
		thumbnailUrl = thumbnailUrl+"/"+suffixDroplr;
		continueCreatingThePreview(thumbnailUrl);
	} else if(provider == "cloudApp") {
		$.ajax({
			url: linkURL,
			type: 'GET',
			dataType: 'json',
			headers: {"Accept": "application/json"}
		})
		.done(function(data) {
			thumbnailUrl = data.thumbnail_url;
			if(thumbnailUrl != "")
				continueCreatingThePreview(thumbnailUrl);
		});
	} else if(provider == "instagram") {
		$.ajax({
			url: 'https://api.instagram.com/oembed?url='+linkURL,
			type: 'GET',
			dataType: 'json'
		})
		.done(function(data) {
			if(thumbSize == "large") continueCreatingThePreview(data.url.replace(/[0-9].jpg$/,"8.jpg"));
			if(thumbSize == "medium") continueCreatingThePreview(data.url.replace(/[0-9].jpg$/,"6.jpg"));
			if(thumbSize == "small") continueCreatingThePreview(data.url.replace(/[0-9].jpg$/,"5.jpg"));
		});
		
	} else if(provider == "flickr") {
		if(thumbSize == "large") maxWidth = 800;
		if(thumbSize == "medium") maxWidth = 500;
		if(thumbSize == "small") maxWidth = 300;
		flickUrl = linkURL.replace(":","%3A");
		$.ajax({
			url: 'https://www.flickr.com/services/oembed/?url='+flickUrl+'&format=json&maxwidth='+maxWidth,
			type: 'GET',
			dataType: "json"
		})
		.done(function(data) {
			continueCreatingThePreview(data.url);
		});
	} else if(provider == "fivehundredpx") {
		photoID = linkURL.replace(/http(|s):\/\/500px.com\/photo\//,"");
		if(thumbSize == "large") suffixFiveHundred = "4";
		if(thumbSize == "medium") suffixFiveHundred = "3";
		if(thumbSize == "small") suffixFiveHundred = "2";
		$.ajax({
			// Don't steal my consumer key, please !
			url: "https://api.500px.com/v1/photos/"+photoID+"?consumer_key=8EUWGvy6gL8yFLPbuF6A8SvbOIxSlVJzQCdWSGnm",
			type: 'GET',
			dataType: "json"
		})
		.done(function(data) {
			picURL = data.photo.image_url.replace(/[0-9].jpg$/,suffixFiveHundred+".jpg");
			continueCreatingThePreview(picURL);
		});
	} else if(provider == "tumblr") {
		// Using the appropriate suffix depending of the settings
		if(thumbSize == "large") suffixTumblr = "500";
		if(thumbSize == "medium") suffixTumblr = "400";
		if(thumbSize == "small") suffixTumblr = "250";
		// Getting the file extension of the URL for later
		fileExtension = linkURL.split(".").pop();
		// splitting by the "_" characted to remove the suffix
		splittedURL = linkURL.split("_");
		// Building the new URL
		thumbnailUrl = splittedURL[0]+"_"+splittedURL[1]+"_"+suffixTumblr+"."+fileExtension;
		continueCreatingThePreview(thumbnailUrl);
	}

	function continueCreatingThePreview(thumbnailUrl) {
		fullBleed = "";
		if(thumbSize == "large") {
			marginSuffix = "tm";
			fullBleed = "item-box-full-bleed";
		} else {
			marginSuffix = "vm";
		}
		linkURL = element.getAttribute("data-full-url");
		// Creating the elements, replicating the same layout as TweetDeck's one
		previewDiv = document.createElement("div");
		previewDiv.className = "js-media media-preview position-rel btd-preview "+provider+" "+fullBleed;
		previewDivChild = document.createElement("div");
		previewDivChild.className = "js-media-preview-container position-rel margin-"+marginSuffix;
		previewLink = document.createElement("a");
		previewLink.className = "js-media-image-link block med-link media-item media-size-"+thumbSize+"";
		// Little difference, using rel=url otherwhise TweetDeck will treat it as a "real" media preview, therefore "blocking" the click on it 
		previewLink.setAttribute("rel","url");
		previewLink.href = linkURL;
		previewLink.setAttribute("target","_blank");
		// Applying our thumbnail as a background-image of the preview div
		previewLink.style.backgroundImage = "url("+thumbnailUrl+")";

		// Constructing our final div
		previewDivChild.appendChild(previewLink);
		previewDiv.appendChild(previewDivChild);

		// Adding it next to the <p> element, just before <footer> in a tweet
		// console.log(previewDiv);
		if(thumbSize == "large") {
			pElement = element.parentNode.parentNode.parentNode.parentNode.querySelector("div.js-tweet.tweet");
		} else {
			pElement = element.parentNode.parentNode.querySelector("p.js-tweet-text");
		}
		
		if(pElement) {
			pElement.insertAdjacentElement("afterEnd", previewDiv);
		}
	}
}

function timeIsNotRelative(element, mode) {
	// Getting the timestamp of an item
	d = element.parentNode.getAttribute("data-time");
	// Creating a Date object with it
	td = new Date(parseInt(d));
	if(options.full_after_24h == true) {
		now = new Date();
		difference = now - td;
	    var msPerMinute = 60 * 1000;
	    var msPerHour = msPerMinute * 60;
	    var msPerDay = msPerHour * 24;
	}



	// Creating year/day/month/minutes/hours variables and applying the lead zeros if necessary
	year = td.getFullYear();
	if(year < 10) year = "0"+year;
	month = td.getMonth()+1;
	if(month < 10) month = "0"+month;
	minutes = td.getMinutes();
	if(minutes < 10) minutes = "0"+minutes;
	hours = td.getHours();
	if(hours < 10) hours = "0"+hours;
	day = td.getDate();
	if(day < 10) day = "0"+day;

	// Handling "US" date format
	if(options.full_after_24h == true && difference < msPerDay) {
		dateString = hours+":"+minutes;
	} else {
		if(mode == "absolute_us"){
			dateString =  month+"/"+day+"/"+year+" "+hours+":"+minutes;
		} else {
			dateString =  day+"/"+month+"/"+year+" "+hours+":"+minutes;
		}
	}
	// Changing the content of the "time > a" element with the absolute time
	element.innerHTML = dateString;
	element.classList.add("txt-mute");
}

function nameDisplay(elements, mode) {
	if(mode == "username"){
		// If we just want the @username.
		for (var i = elements.length - 1; i >= 0; i--) {
			// If the username is NOT in a tweet (typically in a <p> element), do the thing
			if(elements[i].parentNode.tagName != "P") {
				// Removing "http://twitter.com" and the last "/" in the link to get the @username
				username = elements[i].getAttribute("href").replace(/http(|s):\/\/twitter.com\//,"").replace(/\//g,"");

				// Placing the username in b.fullname if found or in span.username
				if(elements[i].querySelector("b.fullname")){
					elements[i].querySelector("b.fullname").innerHTML = username;
				} else {
					elements[i].innerHTML = username;
				}
				if(elements[i].querySelector("span.username")){
					elements[i].querySelector("span.username").remove();
				}
			}
		};
	} else if(mode == "fullname") {
		// If we just want the fullname, basically we exterminate the usernames
		for (var i = document.querySelectorAll(".username").length - 1; i >= 0; i--) {
		// Ignoring the elements argument because I'm lazy and it works so, hey ?
		document.querySelectorAll(".username")[i].remove();
		};
	} else if(mode == "inverted") {
		// If we want the @username AND the full name, we'll have to swap them
		for (var i = elements.length - 1; i >= 0; i--) {
			// If the username is NOT in a tweet (typically in a <p> element), do the thing
			if(elements[i].parentNode.tagName != "P") {
				// Removing "http://twitter.com" and the last "/" in the link to get the @username
				username = elements[i].getAttribute("href").split("/").pop();
				if(elements[i].querySelector("b.fullname")) {
					fullname = elements[i].querySelector("b.fullname").innerHTML;
				}

				// Placing the username in b.fullname if found or in span.username
				if(elements[i].querySelector("b.fullname")) {
					elements[i].querySelector("b.fullname").innerHTML = username;
				} else {
					elements[i].innerHTML = username;
				}

				if(elements[i].querySelector("span.username")) {
					elements[i].querySelector("span.username span.at").remove(function() {
						elements[i].querySelector("span.username").innerHTML = fullname;
					});
					
				}


			}
		};
	}
}

function useFullUrl(element) {
	// Pretty easy, getting the data-full-url content and applying it as href in the links. Bye bye t.co !
	links = element.querySelectorAll("a[data-full-url]");
	for (var i = links.length - 1; i >= 0; i--) {
		fullLink = links[i].getAttribute("data-full-url");
		links[i].href = fullLink;
	};
}
