/**
 * @name PinnedDMs
 * @author MBlen01
 * @version 1.0.0
 * @description A plugin to pin DMs and add custom notifications/ringtones.
 * @source https://github.com/MBlen01/BDPlugins
 * @updateUrl https://github.com/MBlen01/BDPlugins/PinnedDMs.plugin.js
 */

module.exports = class PinnedDMs {
    constructor() {
        this.pinnedDMs = BdApi.loadData('PinnedDMs', 'pinnedDMs') || [];
        this.customRingtones = BdApi.loadData('PinnedDMs', 'customRingtones') || {};
        this.lastMessageTimestamps = {};
        this.selectedUserId = null; // To track which user is currently selected for ringtone
    }

    start() {
        this.addPinnedDMsUI();
        this.listenForMessages();
        this.listenForPresenceUpdates();
        this.listenForTyping();
        this.addRightClickMenu();
        this.addSeparatorLine();
        BdApi.showToast("PinnedDMs Plugin Started", { type: "success" });
    }

    stop() {
        const pinnedContainer = document.querySelector("#pinned-dms-list");
        if (pinnedContainer) {
            pinnedContainer.remove();
        }
        const separator = document.querySelector("#pinned-dm-separator");
        if (separator) {
            separator.remove();
        }
        BdApi.showToast("PinnedDMs Plugin Stopped", { type: "error" });
    }

    addPinnedDMsUI() {
        // Create UI container
        const container = document.createElement("div");
        container.id = "pinned-dms-list";
        container.style.position = "absolute";
        container.style.top = "50px";
        container.style.right = "10px";
        container.style.padding = "10px";
        container.style.backgroundColor = "#2C2F33";
        container.style.borderRadius = "5px";
        container.style.zIndex = "9999";
        container.style.maxHeight = "400px";
        container.style.overflowY = "auto";
        
        const title = document.createElement("h3");
        title.textContent = "Pinned DMs";
        title.style.color = "#fff";
        container.appendChild(title);

        // Append pinned DMs
        this.pinnedDMs.forEach((dmId) => {
            const dmElement = this.createDMElement(dmId);
            container.appendChild(dmElement);
        });

        document.body.appendChild(container);
    }

    createDMElement(dmId) {
        const dmElement = document.createElement("div");
        dmElement.style.color = "#fff";
        dmElement.textContent = `DM: ${dmId}`; // Placeholder for DM username
        dmElement.id = `dm-${dmId}`;
        dmElement.style.position = "relative"; // For indicators
        dmElement.draggable = true;  // Make the DM element draggable

        // Add drag-and-drop event listeners
        dmElement.addEventListener('dragstart', (e) => this.handleDragStart(e, dmId));
        dmElement.addEventListener('dragover', (e) => this.handleDragOver(e));
        dmElement.addEventListener('drop', (e) => this.handleDrop(e, dmId));
        
        // Add right-click context menu
        dmElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.selectedUserId = dmId; // Set the selected user ID
            this.showContextMenu(e, dmId);
        });

        return dmElement;
    }

    // Handle right-click menu to pin DMs
    showContextMenu(e, dmId) {
        const menu = document.createElement("div");
        menu.style.position = "absolute";
        menu.style.top = `${e.clientY}px`;
        menu.style.left = `${e.clientX}px`;
        menu.style.backgroundColor = "#2C2F33";
        menu.style.color = "#fff";
        menu.style.padding = "5px";
        menu.style.borderRadius = "5px";
        menu.style.zIndex = "10000";
        menu.innerHTML = `
            <div onclick="BdApi.getPlugin('PinnedDMs').pinDM('${dmId}')">Pin DM</div>
            <div onclick="BdApi.getPlugin('PinnedDMs').removeDM('${dmId}')">Unpin DM</div>
            <div onclick="BdApi.getPlugin('PinnedDMs').showFileBrowser()">Select Ringtone File</div>
        `;
        document.body.appendChild(menu);
        
        document.addEventListener('click', () => menu.remove(), { once: true });
    }

    pinDM(dmId) {
        if (!this.pinnedDMs.includes(dmId)) {
            this.pinnedDMs.push(dmId);
            BdApi.saveData('PinnedDMs', 'pinnedDMs', this.pinnedDMs);
            this.updatePinnedDMsUI();
            BdApi.showToast(`Pinned DM: ${dmId}`, { type: "success" });
        }
    }

    removeDM(dmId) {
        const index = this.pinnedDMs.indexOf(dmId);
        if (index > -1) {
            this.pinnedDMs.splice(index, 1);
            BdApi.saveData('PinnedDMs', 'pinnedDMs', this.pinnedDMs);
            this.updatePinnedDMsUI();
            BdApi.showToast(`Unpinned DM: ${dmId}`, { type: "error" });
        }
    }

    showFileBrowser() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = () => {
            const file = input.files[0];
            const url = URL.createObjectURL(file);
            if (this.selectedUserId) {
                this.customRingtones[this.selectedUserId] = url; // Save to selected user
                BdApi.saveData('PinnedDMs', 'customRingtones', this.customRingtones);
                BdApi.showToast(`Ringtone saved for ${this.selectedUserId}`, { type: "success" });
            }
        };
        input.click();
    }

    addSeparatorLine() {
        const separator = document.createElement("hr");
        separator.id = "pinned-dm-separator";
        separator.style.border = "1px solid #ccc";
        document.body.appendChild(separator);
    }

    // Updated logic for playing custom ringtones
    playCustomRingtone(userId) {
        const ringtoneUrl = this.customRingtones[userId] || "default-ringtone.mp3";
        let audio = new Audio(ringtoneUrl);
        audio.play();
    }

    updateLastMessageTime(userId, timestamp) {
        const currentTime = Date.now();
        const lastMessageTime = new Date(timestamp).getTime();
        const daysAgo = Math.floor((currentTime - lastMessageTime) / (1000 * 60 * 60 * 24));
        this.lastMessageTimestamps[userId] = daysAgo;

        const dmElement = document.querySelector(`#dm-${userId}`);
        if (dmElement) {
            dmElement.textContent = `DM: ${userId} (Last message: ${daysAgo} days ago)`;
            this.updateUserIndicators(userId);
        }
    }

    updateUserIndicators(userId) {
        const dmElement = document.querySelector(`#dm-${userId}`);
        if (dmElement) {
            // Clear existing indicators
            const indicators = dmElement.querySelectorAll('.indicator');
            indicators.forEach(indicator => indicator.remove());

            // Online status
            const onlineStatus = document.createElement("span");
            onlineStatus.className = "indicator";
            onlineStatus.style.position = "absolute";
            onlineStatus.style.top = "0";
            onlineStatus.style.left = "0";
            onlineStatus.style.color = "green";
            onlineStatus.textContent = "🟢"; // Online indicator
            dmElement.appendChild(onlineStatus);
            
            // Typing indicator
            const typingIndicator = document.createElement("span");
            typingIndicator.className = "indicator";
            typingIndicator.style.position = "absolute";
            typingIndicator.style.bottom = "0";
            typingIndicator.style.right = "0";
            typingIndicator.style.color = "yellow";
            typingIndicator.textContent = "✏️"; // Typing indicator
            dmElement.appendChild(typingIndicator);
        }
    }

    listenForMessages() {
        const Dispatcher = BdApi.findModuleByProps("dispatch", "subscribe");
        Dispatcher.subscribe("MESSAGE_CREATE", (event) => {
            const message = event.message;
            if (this.pinnedDMs.includes(message.channel_id)) {
                this.playCustomRingtone(message.author.id);
                this.updateLastMessageTime(message.author.id, message.timestamp);
            }
        });
    }

    listenForPresenceUpdates() {
        const Dispatcher = BdApi.findModuleByProps("dispatch", "subscribe");
        Dispatcher.subscribe("PRESENCE_UPDATE", (event) => {
            const presence = event.presence;
            const userId = presence.userId;
            if (this.pinnedDMs.includes(userId)) {
                this.updateUserStatus(userId, presence.status);
                this.updateUserIndicators(userId);
            }
        });
    }

    listenForTyping() {
        const Dispatcher = BdApi.findModuleByProps("dispatch", "subscribe");
        Dispatcher.subscribe("TYPING_START", (event) => {
            const typingInfo = event.typing;
            if (this.pinnedDMs.includes(typingInfo.channelId)) {
                this.updateUserIndicators(typingInfo.userId);
            }
        });
    }

    updateUserStatus(userId, status) {
        // Update user online status if needed
        const dmElement = document.querySelector(`#dm-${userId}`);
        if (dmElement) {
            const onlineIndicator = dmElement.querySelector(".indicator");
            if (status === "online") {
                onlineIndicator.style.color = "green"; // Online color
            } else {
                onlineIndicator.style.color = "red"; // Offline color
            }
        }
    }

    updatePinnedDMsUI() {
        const container = document.querySelector("#pinned-dms-list");
        if (container) {
            container.innerHTML = ""; // Clear existing elements
            const title = document.createElement("h3");
            title.textContent = "Pinned DMs";
            title.style.color = "#fff";
            container.appendChild(title);

            this.pinnedDMs.forEach((dmId) => {
                const dmElement = this.createDMElement(dmId);
                container.appendChild(dmElement);
            });
        }
    }

    getSettingsPanel() {
        const panel = document.createElement("div");
        panel.innerHTML = `
            <h3>Pinned DMs Settings</h3>
            <label>Set custom ringtone URL for a pinned user (example: user123):</label><br>
            <input type="text" id="user-id" placeholder="User ID"><br>
            <input type="text" id="ringtone-url" placeholder="Ringtone URL"><br>
            <button id="save-ringtone">Save Ringtone</button>
            <button id="select-file">Select Ringtone File</button>
        `;

        panel.querySelector("#save-ringtone").onclick = () => {
            const userId = panel.querySelector("#user-id").value;
            const ringtoneUrl = panel.querySelector("#ringtone-url").value;

            if (userId && ringtoneUrl) {
                this.customRingtones[userId] = ringtoneUrl;
                BdApi.saveData('PinnedDMs', 'customRingtones', this.customRingtones);
                BdApi.showToast(`Ringtone saved for ${userId}`, { type: "success" });
            }
        };

        panel.querySelector("#select-file").onclick = () => {
            this.showFileBrowser();
        };

        return panel;
    }
};

