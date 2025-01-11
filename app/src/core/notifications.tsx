 export const requestNotificationPermission = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          alert("You will receive notifications!");
        } else if (permission === "denied") {
          alert("You have denied notifications.");
        }
      });
    } else {
      alert("This browser does not support desktop notifications.");
    }
  };

  export const sendNotification = ({title, body}: {title:string, body:string}) => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: body,
        icon: "https://jizz.be/images/logo.svg",
      });
    } else {
      alert("Please allow notifications first.");
    }
  };