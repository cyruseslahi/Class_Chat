# ReType Authentication Setup Guide

## 🎯 Overview

ReType now includes a complete authentication system using Supabase. Users can sign up, log in, and their progress is tied to their account.

---

## 📋 Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project in your Supabase dashboard

---

## 🔧 Setup Instructions

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** > **API**
3. Copy the following:
   - **Project URL** (already set: `https://wajonnuqudzgjivsgiam.supabase.co`)
   - **anon/public key** (you need to replace this in the code)

### Step 2: Update the Code

Open `app.js` and find line 7:

```javascript
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'; // ⚠️ REPLACE THIS
```

Replace `'YOUR_SUPABASE_ANON_KEY'` with your actual anon key from Step 1.

### Step 3: Create the Database Table

In your Supabase dashboard, go to **SQL Editor** and run this SQL:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  level int DEFAULT 1,
  bio text,
  total_time_typed int DEFAULT 0,
  streak_current int DEFAULT 0,
  streak_best int DEFAULT 0,
  tests_started int DEFAULT 0,
  tests_completed int DEFAULT 0,
  activity_log jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Step 4: Configure Email Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. Enable **Email** provider
3. Configure email templates (optional but recommended)

---

## 🎨 Features Implemented

### Login/Signup Modal
- **Clean, dark, minimalist design** matching Squarespace aesthetic
- **Full-screen overlay** with centered form
- **Smooth animations** for opening/closing
- **Toggle between login and signup** modes
- **Error handling** with user-friendly messages

### Authentication Flow

#### Login
1. User clicks "Login" button in header
2. Modal opens with email/password inputs
3. On submit, authenticates with Supabase
4. Fetches user profile (username, level) from `profiles` table
5. Stores user data in `localStorage`
6. Updates header to show username and level
7. Closes modal

#### Signup
1. User clicks "Create an Account" link
2. Form switches to signup mode (adds username field)
3. On submit:
   - Creates auth user in Supabase
   - Creates profile entry in `profiles` table
   - Auto-logs in the user
   - Updates header
   - Closes modal

#### Logout
1. User clicks their username in header
2. Dropdown appears with "Profile" (disabled) and "Log out"
3. On logout:
   - Signs out from Supabase
   - Clears `localStorage`
   - Updates header to show "Login" button

### UI States

**Not Logged In:**
- Header shows "Login" button on the right

**Logged In:**
- Header shows:
  - 🔔 Notification bell
  - Username (clickable for dropdown)
  - Level badge (e.g., "46")

---

## 🎨 Design Specifications

### Auth Modal Styling
- **Background**: Solid black (#000000)
- **Centered layout**: Flexbox vertical centering
- **No box container**: Flat, minimal design
- **Typography**: Inter font family

### Inputs
```css
background: transparent;
border: none;
border-bottom: 1px solid #444;
color: #fff;
```
- On focus: `border-bottom: 1px solid #fff;`

### Submit Button
```css
background: #cfcfcf;
color: #000;
height: 40px;
font-weight: 500;
```
- On hover: `background: #fff;`

### Links
```css
color: rgba(255,255,255,0.6);
font-size: 0.85rem;
```
- On hover: `color: #fff;`

---

## 📱 Responsive Design

- **Desktop**: Full-width modal (max 400px)
- **Mobile**: Adapts to 90% viewport width
- **All transitions**: Smooth 0.2s ease

---

## 🔐 Security Notes

1. **Never commit your Supabase anon key** to public repositories
2. Use environment variables in production
3. Row Level Security (RLS) is enabled on the `profiles` table
4. Users can only access their own profile data

---

## 🚀 Future Enhancements

- [ ] Password reset functionality
- [ ] Google OAuth integration
- [ ] Email verification
- [ ] Profile editing
- [ ] Level progression system
- [ ] Sync typing progress to database

---

## 🐛 Troubleshooting

### "Invalid email or password" error
- Check that the user exists in Supabase Auth
- Verify email/password are correct
- Check Supabase dashboard for auth logs

### "Could not load user profile" error
- Ensure the `profiles` table exists
- Check that a profile entry was created for the user
- Verify RLS policies are set correctly

### Modal doesn't open
- Check browser console for JavaScript errors
- Verify Supabase CDN script is loaded
- Ensure `supabaseKey` is set correctly

### User data not persisting
- Check `localStorage` in browser DevTools
- Verify `retype_user` key exists
- Clear localStorage and try logging in again

---

## 📞 Support

For issues or questions:
1. Check the browser console for errors
2. Verify Supabase dashboard for auth/database logs
3. Review this setup guide carefully

---

**Built with ❤️ for ReType**

