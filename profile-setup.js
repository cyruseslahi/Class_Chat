import { getCurrentUser } from "./auth.js";
import { saveProfile } from "./profile.js";

// Check if user is authenticated
getCurrentUser().then(user => {
  if (!user) {
    window.location.href = "index.html";
  }
}).catch(() => {
  window.location.href = "index.html";
});

// Class management
let classCount = 0;

function addClassRow() {
  classCount++;
  const container = document.getElementById("classesContainer");
  const classRow = document.createElement("div");
  classRow.className = "class-row";
  classRow.id = `classRow-${classCount}`;
  
  classRow.innerHTML = `
    <span class="class-row-label">Class ${classCount}</span>
    <input type="text" class="period-input" placeholder="Period" data-class-id="${classCount}">
    <input type="text" placeholder="Class Name" class="class-name" data-class-id="${classCount}">
    <input type="text" placeholder="Teacher" class="class-teacher" data-class-id="${classCount}">
    <button type="button" class="btn-remove" onclick="removeClassRow(${classCount})">Remove</button>
  `;
  
  container.appendChild(classRow);
  
  // Update labels for all remaining rows
  updateClassLabels();
}

function updateClassLabels() {
  const rows = document.querySelectorAll(".class-row");
  rows.forEach((row, index) => {
    const label = row.querySelector(".class-row-label");
    if (label) {
      label.textContent = `Class ${index + 1}`;
    }
  });
}

// Make removeClassRow available globally
window.removeClassRow = function(classId) {
  const row = document.getElementById(`classRow-${classId}`);
  if (row) {
    row.remove();
    // Update labels after removal
    updateClassLabels();
  }
};

// Add initial class row
addClassRow();

// Add class button
document.getElementById("addClassBtn").addEventListener("click", addClassRow);

// Form submission
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorDiv = document.getElementById("profileError");
  
  try {
    // Collect class data
    const classes = [];
    const classRows = document.querySelectorAll(".class-row");
    classRows.forEach(row => {
      const period = row.querySelector(".period-input").value.trim();
      const name = row.querySelector(".class-name").value.trim();
      const teacher = row.querySelector(".class-teacher").value.trim();
      
      if (period || name || teacher) {
        classes.push({
          period: period || "",
          name: name || "",
          teacher: teacher || ""
        });
      }
    });
    
    const profileData = {
      display_name: document.getElementById("displayName").value.trim(),
      bio: document.getElementById("bio").value.trim(),
      grade: document.getElementById("grade").value,
      classes: classes,
      interests: document.getElementById("interests").value.trim()
    };
    
    if (!profileData.display_name) {
      throw new Error("Display name is required");
    }
    
    await saveProfile(profileData);
    
    // Redirect to home page
    window.location.href = "home.html";
  } catch (error) {
    errorDiv.textContent = error.message || "Failed to save profile";
    errorDiv.style.display = "block";
  }
});

