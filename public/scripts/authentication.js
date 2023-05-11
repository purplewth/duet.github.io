const Authentication = (function() {
    let user = null;

    const getUser = function() {
        return user;
    }

    const signin = function(username, password, onSuccess, onError) {
        const user_data = {username, password};
 
        fetch('/signin', {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(user_data)
        })  .then((res) => res.json())  
            .then((json) => {
                if (json.status=='error') {
                    if (onError) onError(json.error);
                }
                else if (json.status=='success') {
                    user = json.user;
                    if (onSuccess) onSuccess();
                }
        })  .catch((err) => {
                console.log(err);
            }
        )
    };

    const validate = function(onSuccess, onError) {
        fetch('/validate')
            .then((res) => res.json())
            .then((json) => {
                if (json.status=='error') {
                    if (onError) onError();
                }
                else if (json.status=='success') {
                    user = json.user;
                    if (onSuccess) onSuccess();
                }
            })
            .catch((err) => {
                console.log(err);
            })
    };

    const signout = function(onSuccess, onError) {

        fetch('/signout')
            .then((res) => res.json())
            .then((json) => {
                if (json.status=='success') {
                    user = null;
                    if (onSuccess) onSuccess();
                }
            })
            .catch((err) => {
                console.log(err);
            })
    };

    return { getUser, signin, validate, signout };
})();
