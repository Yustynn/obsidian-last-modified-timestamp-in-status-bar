# Last Modified Timestamp in Status Bar
Displays the last modified timestamp of your current note on your status bar!

## Usage
The timestamp updates frequently (every 2 seconds, and when notes are switched).

![demo](./img/demo.png)

## Customizability
- Enable/disable toggle for both **created** and **last modified** timestamps
- Timestamp format for both **created** and **last modified** timestamps
- Timestamp title in status bar for both **created** and **last modified** timestamps
- Refresh interval for **last modified** timestamp

![settings](./img/settings.png)

# Change Log
## 1.3.0
- (efficiency) Update modification time based on a change (vault `modify`) event, instead of constant polling

Thanks to @ pjeby for the PR

## 1.2.0
- Add ability to toggle **Created** and **Last Modified** timestamps

Thanks to @joeraad for the PR

## 1.1.0
- Add **Created** timestamp
- Add ability to change the **Last Modified** refresh interval
