const form_inputs = async () => {
  let x = document.forms["profit-analysis"];
  let profit_value = x.elements["profit-value"].value;
  let selected_genre = x.elements["movie-genre"].value;
  let filtered_dataset = dataset
    .filter(k => {
      if (selected_genre != -1) {
        let genres_arr = JSON.parse(k.genres);
        return genres_arr.filter(e => e.id == selected_genre).length > 0; // Filter that sorts by genre of the movie, since the genres are individual JSON arrays I had to apply thus hack
      } else {
        return true; // If "All" genre is selected then we don't perform the filteration
      }
    })
    .filter(e => e.profit > profit_value); // Filter by profit made by the movie
  let temp = {
    x: [unpack(filtered_dataset, "revenue")],
    y: [unpack(filtered_dataset, "budget")],
    z: [unpack(filtered_dataset, "profit")],
    text: [unpack(filtered_dataset, "title")],
    "marker.color": [unpack(filtered_dataset, "profit")]
  };
  test = await Plotly.restyle(test, temp);
  return;
};

const unpack = (rows, key) => {
  return rows.map(function(row) {
    return row[key];
  });
};

const modify_elements = async () => {
  let x = document.getElementById("movie-genre");
  genres = new Map();
  dataset.map(e => {
    let arr = JSON.parse(e.genres);
    arr.forEach(genre => genres.set(genre.id, genre.name));
  });
  genres.delete(undefined);
  genres.forEach((e, i) => {
    let option = document.createElement("option");
    option.value = i;
    option.text = e;
    x.add(option);
  });
  return;
};

const test_init = async () => {
  dataset = await d3.csv("dataset/dataset.csv");
  credits_dataset = await d3.csv("dataset/credits_dataset.csv");
  dataset.map(row => (row.profit = row.revenue - row.budget));

  trace1 = {
    x: unpack(dataset, "revenue"),
    y: unpack(dataset, "budget"),
    z: unpack(dataset, "profit"),
    text: unpack(dataset, "title"),
    hovertemplate:
      "<b>Title</b>: %{text}" + "<br><i>Profit</i>: $%{z}<br><extra></extra>",
    textposition: "bottom center",
    mode: "markers",
    marker: {
      size: 5,
      opacity: 0.8,
      color: unpack(dataset, "profit")
    },
    type: "scatter3d"
  };

  data = [trace1];
  layout = {
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    scene: {
      xaxis: {
        title: {
          text: "Revenue"
        }
      },
      yaxis: {
        title: {
          text: "Budget"
        }
      },
      zaxis: {
        title: {
          text: "Profit"
        }
      }
    }
  };
  test = await Plotly.newPlot("chart-1", data, layout, { responsive: true });
  await modify_elements();
};

let test;
let dataset;
let credits_dataset;
let layout;
let data;
let trace1;
let genres;

test_init();
