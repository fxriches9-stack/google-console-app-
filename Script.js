const input = document.getElementById("input");
const output = document.getElementById("output");

input.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    const command = input.value.trim();
    handleCommand(command);
    input.value = "";
  }
});

function handleCommand(command) {
  switch (command.toLowerCase()) {
    case "help":
      printOutput('Available commands: help, clear, hello, date');
      break;
    case "clear":
      output.innerHTML = "";
      break;
    case "hello":
      printOutput("Hello, user! Welcome to Google Console App.");
      break;
    case "date":
      printOutput(new Date().toString());
      break;
    default:
      printOutput(`Unknown command: ${command}`);
  }
}

function printOutput(text) {
  output.innerHTML += `<div>${text}</div>`;
}
