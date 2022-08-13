function debounce(callback, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            callback.apply(this, args);
        }, wait);
    };
}

document.querySelector("#searchbox").addEventListener(
    "keyup",
    debounce(() => {
        reset();

        const keyword = document.querySelector("#searchbox").value.trim();
        if (keyword !== "") {
            getListItems(keyword, "movie");
            getListItems(keyword, "series");
        }
    }, 500)
);

const reset = () => {
    for (let el of document.getElementsByClassName("shown")) {
        el.classList.add("hidden");
    }
    document.getElementById("movie-list").innerHTML = "";
    document.getElementById("series-list").innerHTML = "";
};

const getUrl = (keyword, type) => {
    return (
        "https://www.omdbapi.com/?apikey=7468f8b0&s=" +
        encodeURIComponent(keyword) +
        "&type=" +
        type
    );
};

const getListItems = (keyword, type) => {
    fetch(getUrl(keyword, type))
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            const results = response["Search"]
                .slice(0, 3)
                .map((it) => it["Title"]);
            if (results.length > 0) {
                const suggestion = document.getElementById("suggestions");
                if (suggestion.classList.contains("hidden")) {
                    showElement(suggestion);
                }
                showElement(document.getElementById(type + "-div"));
                const list = document.getElementById(type + "-list");
                results.forEach((it) => {
                    list.innerHTML += formListItem(it, keyword);
                });
            }
        });
};

const showElement = (element) => {
    element.classList.remove("hidden");
    element.classList.add("shown");
};

const formListItem = (title, keyword) => {
    const foundAt = title.toLowerCase().indexOf(keyword.toLowerCase());
    const endAt = foundAt + keyword.length;

    const htmlTitle =
        foundAt >= 0
            ? title.substring(0, foundAt) +
              "<strong>" +
              title.substring(foundAt, endAt) +
              "</strong>" +
              title.substring(endAt)
            : title;

    return (
        '<li><a href="#" class="block hover:bg-gray-200 rounded px-2 py-1">' +
        htmlTitle +
        "</a></li>"
    );
};

const demo = () => {
    console.log("not implement");
};
