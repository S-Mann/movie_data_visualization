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
  let color_arr = unpack(filtered_dataset, "profit");
  let sd = standardDeviation(color_arr);
  let mean = average(color_arr);
  color_arr = color_arr.map(e => (e - mean) / sd);
  let temp = {
    x: [unpack(filtered_dataset, "revenue")],
    y: [unpack(filtered_dataset, "budget")],
    z: [unpack(filtered_dataset, "profit")],
    text: [unpack(filtered_dataset, "title")],
    "marker.color": [color_arr]
  };
  graph1 = await Plotly.restyle(graph1, temp);
  return;
};

const actor_analysis_form = async () => {
  let actor_ids = $("#actor-search").val();
  let filtered_dataset = lead_actors_dataset.filter(e =>
    actor_ids.includes(e.id.toString())
  );
  let color_arr = unpack(filtered_dataset, "avg_profit");
  let sd = standardDeviation(color_arr);
  let mean = average(color_arr);
  color_arr = color_arr.map(e => (e - mean) / sd);
  let temp = {
    x: [unpack(filtered_dataset, "avg_vote")],
    y: [unpack(filtered_dataset, "avg_budget")],
    z: [unpack(filtered_dataset, "avg_profit")],
    text: [unpack(filtered_dataset, "name")],
    "marker.color": [color_arr]
  };
  graph2 = await Plotly.restyle(graph2, temp);
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

const standardDeviation = values => {
  if (values.length > 1) {
    let avg = average(values);
    let squareDiffs = values.map(value => {
      let diff = value - avg;
      let sqrDiff = diff * diff;
      return sqrDiff;
    });

    let avgSquareDiff = average(squareDiffs);
    let stdDev = avgSquareDiff ** 0.5;
    return stdDev;
  } else {
    return 1;
  }
};

const average = data => {
  if (data.length > 1) {
    let sum = data.reduce((sum, value) => {
      return sum + value;
    }, 0);
    let avg = sum / data.length;
    return avg;
  } else {
    return 0;
  }
};

const credits_and_movie_join = async () => {
  movie_credit_rel = credits_dataset
    .map(e => {
      let cast_arr = JSON.parse(e.cast);
      cast_arr = cast_arr.slice(0, 2);
      cast_arr = cast_arr.map(e => {
        return { id: e.id, name: e.name };
      });
      return { movie_id: e.movie_id, lead_actors: cast_arr };
    })
    .map(x => Object.assign(x, dataset.find(y => y.id == x.movie_id)))
    .map(x => {
      return {
        id: x.id,
        lead_actors: x.lead_actors,
        profit: x.profit,
        vote: parseFloat(x.vote_average),
        budget: parseInt(x.budget)
      };
    });
  lead_actors_map = new Map();
  movie_credit_rel.map(e =>
    e.lead_actors.map(f => {
      if (lead_actors_map.get(f.id)) {
        let temp = lead_actors_map.get(f.id);
        temp.profit += e.profit;
        temp.budget += parseInt(e.budget);
        temp.vote += e.vote;
        temp.movies_featured += 1;
        lead_actors_map.set(f.id, temp);
      } else {
        lead_actors_map.set(f.id, {
          id: f.id,
          name: f.name,
          budget: parseInt(e.budget),
          profit: e.profit,
          vote: e.vote,
          movies_featured: 1
        });
      }
    })
  );
  lead_actors_map.delete(undefined);
  lead_actors_dataset = Array.from(lead_actors_map.values());
  lead_actors_dataset
    .filter(e => e.movies_featured < 3)
    .map(e => lead_actors_map.delete(e.id));
  lead_actors_dataset = Array.from(lead_actors_map.values());
  lead_actors_dataset = lead_actors_dataset.map(e => {
    return {
      id: e.id,
      name: e.name,
      avg_budget: parseInt(e.budget / e.movies_featured),
      avg_profit: parseInt(e.profit / e.movies_featured),
      avg_vote: parseFloat((e.vote / e.movies_featured).toFixed(2)),
      movies_featured: e.movies_featured
    };
  });
  lead_actors_map.forEach((e, i) => {
    $("#actor-search").append(
      '<option value="' + i + '">' + e.name + "</option>"
    );
  });
  $("#actor-search").selectpicker("refresh");
  $("#actor-search").selectpicker("selectAll");
  $("#actor-search").selectpicker("refresh");
  return;
};

const init = async () => {
  let form_div = document.getElementById("form-div");
  let loading_spinner = document.getElementById("loading-spinner");
  form_div.style.display = "none";
  dataset = await d3.csv("dataset/dataset.csv");
  credits_dataset = await d3.csv("dataset/credits_dataset.csv");
  dataset.map(row => (row.profit = row.revenue - row.budget));

  await modify_elements();
  await credits_and_movie_join();

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

  let color_arr = unpack(lead_actors_dataset, "avg_profit");
  let sd = standardDeviation(color_arr);
  let mean = average(color_arr);
  color_arr = color_arr.map(e => (e - mean) / sd);

  trace2 = {
    x: unpack(lead_actors_dataset, "avg_vote"),
    y: unpack(lead_actors_dataset, "avg_budget"),
    z: unpack(lead_actors_dataset, "avg_profit"),
    text: unpack(lead_actors_dataset, "name"),
    hovertemplate:
      "<b>Title</b>: %{text}" +
      "<br><i>Profit</i>: $%{z}" +
      "<br><i>Average Movie Rating</i>: %{x}<br><extra></extra>",
    textposition: "bottom center",
    mode: "markers",
    marker: {
      size: 5,
      opacity: 0.8,
      color: color_arr
    },
    type: "scatter3d"
  };

  data1 = [trace1];
  data2 = [trace2];
  layout1 = {
    autosize: true,
    width: "100%",
    height: "100%",
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
  layout2 = {
    autosize: true,
    width: "100%",
    height: "100%",
    margin: {
      l: 0,
      r: 0,
      b: 0,
      t: 0
    },
    scene: {
      xaxis: {
        title: {
          text: "Average Rating"
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
  graph1 = await Plotly.newPlot("chart-1", data1, layout1, { responsive: true });
  graph2 = await Plotly.newPlot("chart-2", data2, layout2, { responsive: true });
  loading_spinner.style.display = "none";
  form_div.style.display = "block";
};

let graph1;
let graph2;
let dataset;
let credits_dataset;
let layout1;
let layout2;
let data;
let trace1;
let trace2;
let genres;
let lead_actors_map;
let movie_credit_rel;
let lead_actors_dataset;

init();
