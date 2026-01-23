console.clear?.();

function wait(name, ms) {
  return new Promise(resolve => {
    console.log(`${name} started`);
    setTimeout(() => {
      console.log(`${name} finished`);
      resolve(name);
    }, ms);
  });
}

console.time("Promise.all total time");

Promise.all([
  wait("Promise A", 5000),
  wait("Promise B", 5000),
  wait("Promise C", 5000),
]).then(results => {
  console.timeEnd("Promise.all total time");
  console.log("Results:", results);
});
