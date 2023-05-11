const SignInForm = (function() {
    const initialize = function() {
        
        $("#signin-overlay").hide();

        $("#signin-form").on("submit", (e) => {
            e.preventDefault();

            const username = $("#signin-username").val().trim();
            const password = $("#signin-password").val().trim();

            Authentication.signin(username, password,
                () => {
                    hide();
                    UserPanel.update(Authentication.getUser());
                    UserPanel.show();

                    OnlineUsersPanel.show();

                    GameLobby.show();

                    Socket.connect(); // Connect to the Socket.IO server here
                },
                (error) => { $("#signin-message").text(error); }
            );
        });

        $("#register-form").on("submit", (e) => {

            e.preventDefault();

            const username = $("#register-username").val().trim();
            const password = $("#register-password").val().trim();
            const confirmPassword = $("#register-confirm").val().trim();

            if (password != confirmPassword) {
                $("#register-message").text("Passwords do not match.");
                return;
            }

            Registration.register(username, password,
                () => {
                    $("#register-form").get(0).reset();
                    $("#register-message").text("You can sign in now.");
                },
                (error) => { $("#register-message").text(error); }
            );
        });
    };

    const show = function() {
        $("#signin-overlay").fadeIn(500);
    };

    const hide = function() {
        $("#signin-form").get(0).reset();
        $("#signin-message").text("");
        $("#register-message").text("");
        $("#signin-overlay").fadeOut(500);
    };

    return { initialize, show, hide };
})();

const UserPanel = (function() {
    const initialize = function() {
        $("#user-panel").hide();

        $("#signout-button").on("click", () => {
            Authentication.signout(
                () => {
                    Socket.disconnect();

                    hide();

                    OnlineUsersPanel.hide();
                    GameLobby.hide();
                    GameRoom.hide();

                    SignInForm.show();
                }
            );
        });
    };

    const show = function() {
        $("#user-panel").show();
    };

    const hide = function() {
        $("#user-panel").hide();
    };

    const update = function(user) {
        if (user) {
            $("#user-panel .user-avatar").html("&#128126"); //alien monster
            $("#user-panel .user-name").text(user.username);
        }
        else {
            $("#user-panel .user-avatar").html("");
            $("#user-panel .user-name").text("");
        }
    };

    return { initialize, show, hide, update };
})();

const OnlineUsersPanel = (function() {
    const initialize = function() {
        hide();
    };

    const show = function() {
        $("#online-users-panel").show();
    };

    const hide = function() {
        $("#online-users-panel").hide();
    };

    const update = function(onlineUsers) {
        const onlineUsersArea = $("#online-users-area");

        // Clear the online users panel
        onlineUsersArea.empty();

		// Get the current user
        const currentUser = Authentication.getUser();

        // Add the user one-by-one
        for (const username in onlineUsers) {
            if (username != currentUser.username) {
                onlineUsersArea.append(
                    $("<div id='username-" + username + "'></div>")
                        .append(UI.getUserDisplay(onlineUsers[username].username))
                );
            }
        }
    };

	const addUser = function(username) {
        const onlineUsersArea = $("#online-users-area");
		
		const userDiv = onlineUsersArea.find("#username-" + username);
		
		if (userDiv.length == 0) {
			onlineUsersArea.append(
				$("<div id='username-" + username + "'></div>")
					.append(UI.getUserDisplay(username))
			);
		}
	};

	const removeUser = function(username) {
        const onlineUsersArea = $("#online-users-area");
		
		const userDiv = onlineUsersArea.find("#username-" + username);
		
		if (userDiv.length > 0) userDiv.remove();
	};

    return { initialize, show, hide, update, addUser, removeUser };
})();


const GameLobby = (function() {
    const initialize = function() {
        hide();

        $("#create-room-form").on('submit', (e) => {

            e.preventDefault();

            const roomName = $("#room-name-input").val().trim();

            Socket.createRoom(roomName);
        });
    };

    const show = function() {
        $("#game-lobby").show();
    };

    const hide = function() {
        $("#game-lobby").hide();
    };

    const update = function(availableRooms) {
        const roomArea = $("#room-area");

        roomArea.empty();

        for (const roomName in availableRooms) {
            roomArea.append(
                $("<div id='room-" + roomName + "'></div>")
                    .append("<button id='join-room-" + roomName + "'>" + roomName + "</div>")
            );

            $("#join-room-" + roomName).on("click", (e) => {
                e.preventDefault();

                Socket.joinRoom(roomName);
            })
        }
    };

    const createRoomError = function(errorMessage) {
        $("#create-room-message").text(errorMessage);
    };

    const joinRoomError = function(errorMessage) {
        $("#create-room-message").text(errorMessage);
    }

    $("#show-how-to-play").on("click", () => {
        // if the show gameplay description is on click
        // check if the gameplay plane is already displayed
        $("#gameplay-overlay").show();
    })
    $("#close-gameplay-btn").on("click", () => {
        $("#gameplay-overlay").hide();
    })

    return {initialize, show, hide, update, createRoomError, joinRoomError };
})();


const GameRoom = (function () {
    const initialize = function() {
        hide();

        $("#leave-room-button").on("click", () => {
            const roomName = $("#room-name").text().trim();

            Socket.leaveRoom(roomName);
        });

        $("#ready-button").on("click", () => {
            const roomName = $("#room-name").text().trim();

            Socket.readyOnClick(roomName);
        });
    };

    const show = function() {
        $("#game-room").show();
    };

    const hide = function () {
        $("#game-room").hide();
    };

    const setRoomName = function(roomName) {
        $("#room-name").text(roomName);
    }

    const addUser = function(username) {
        const usersArea = $("#room-users-area")
        const userDiv = usersArea.find("#room-user-" + username);

        if (userDiv.length == 0) {
            usersArea.append(
                $("<div id='room-user-" + username + "'></div>")
                    .append(UI.getUserDisplay(username))
            )
        }
    };

    const update = function(room) {
        const roomUsersArea = $("#room-users-area");

        roomUsersArea.empty();

        // Add the user one-by-one
        for (const username in room) {
            roomUsersArea.append(
                $("<div id='username-" + username + "' class='room-user-display'></div>")
                    .append(UI.getUserDisplay(username).append($("<span id=" + username + "-ready-status class='user-ready-status'></div>")))
            );

            if (room[username].ready) {
                $("#" + username + "-ready-status").text("Ready!");
            }
            
            else {
                $("#" + username + "-ready-status").text("");
            }
        }        
    };

    return {initialize, show, hide, setRoomName, addUser, update};
})();


const UI = (function() {
    // This function gets the user display
    const getUserDisplay = function(username) {
        return $("<div class='field-content row shadow'></div>")
            .append($("<span class='user-avatar'>&#128126</span>"))
            .append($("<span class='user-name'> " + username + "</span>"));
    };

    const components = [
        SignInForm, 
        UserPanel, 
        OnlineUsersPanel,
        GameLobby,
        GameRoom
    ];

    // This function initializes the UI
    const initialize = function() {
        for (const component of components) {
            component.initialize();
        }
    };

    return { getUserDisplay, initialize };
})();


