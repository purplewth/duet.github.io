const Registration = (function() {
    const register = function(username, password, onSuccess, onError) {

        const user_data = {username, password};
 
        fetch("/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(user_data)
        })  .then((res) => res.json())
            .then((json) => {
                if (json.status=='error') {
                    if (onError) onError(json.error);
                }
                else {
                    if (onSuccess) onSuccess();
                }
            })
        .catch((err) => {
            console.log("Error!");
        });
    };

    return { register };
})();
