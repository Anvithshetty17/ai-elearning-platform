const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // Development - use Ethereal Email (fake SMTP)
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_HOST) {
      return nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        }
      });
    }

    // Production - use configured SMTP
    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail(options) {
    try {
      const message = {
        from: `${process.env.EMAIL_FROM_NAME || 'AI E-Learning Platform'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || options.message
      };

      const info = await this.transporter.sendMail(message);
      
      console.log('Email sent:', info.messageId);
      
      // Log preview URL in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }

      return info;
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Email could not be sent');
    }
  }

  // Welcome email template
  async sendWelcomeEmail(user) {
    const subject = 'Welcome to AI E-Learning Platform!';
    const html = this.getWelcomeEmailTemplate(user);

    return this.sendEmail({
      email: user.email,
      subject,
      html
    });
  }

  // Email verification template
  async sendEmailVerification(user, verificationToken) {
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    const subject = 'Verify Your Email Address';
    const html = this.getEmailVerificationTemplate(user, verificationUrl);

    return this.sendEmail({
      email: user.email,
      subject,
      html
    });
  }

  // Password reset email template
  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const subject = 'Password Reset Request';
    const html = this.getPasswordResetTemplate(user, resetUrl);

    return this.sendEmail({
      email: user.email,
      subject,
      html
    });
  }

  // Course enrollment notification
  async sendEnrollmentConfirmation(user, course) {
    const subject = `Enrollment Confirmed: ${course.title}`;
    const html = this.getEnrollmentTemplate(user, course);

    return this.sendEmail({
      email: user.email,
      subject,
      html
    });
  }

  // Course completion certificate
  async sendCompletionCertificate(user, course, certificateUrl) {
    const subject = `Course Completed: ${course.title}`;
    const html = this.getCompletionTemplate(user, course, certificateUrl);

    return this.sendEmail({
      email: user.email,
      subject,
      html
    });
  }

  // New lecture notification
  async sendNewLectureNotification(user, course, lecture) {
    const subject = `New Lecture Available: ${lecture.title}`;
    const html = this.getNewLectureTemplate(user, course, lecture);

    return this.sendEmail({
      email: user.email,
      subject,
      html
    });
  }

  // Course reminder email
  async sendCourseReminder(user, course, lastAccessDays) {
    const subject = `Continue Learning: ${course.title}`;
    const html = this.getCourseReminderTemplate(user, course, lastAccessDays);

    return this.sendEmail({
      email: user.email,
      subject,
      html
    });
  }

  // Email templates
  getWelcomeEmailTemplate(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to AI E-Learning Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AI E-Learning Platform!</h1>
          </div>
          <div class="content">
            <p>Hello ${user.name},</p>
            <p>Welcome to the future of learning! We're excited to have you join our AI-powered e-learning community.</p>
            <p>With your account, you can:</p>
            <ul>
              <li>📚 Access thousands of courses across various subjects</li>
              <li>🤖 Experience AI-generated lectures and content</li>
              <li>📊 Track your learning progress and achievements</li>
              <li>🎓 Earn certificates upon course completion</li>
              <li>👥 Connect with instructors and fellow learners</li>
            </ul>
            <p>Ready to start your learning journey?</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" class="button">Explore Courses</a>
            <p>If you have any questions, our support team is here to help!</p>
            <p>Happy Learning!</p>
            <p><strong>The AI E-Learning Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 AI E-Learning Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getEmailVerificationTemplate(user, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Hello ${user.name},</p>
            <p>Thank you for signing up for AI E-Learning Platform! To complete your registration, please verify your email address.</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, you can safely ignore this email.</p>
            <p><strong>The AI E-Learning Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 AI E-Learning Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(user, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${user.name},</p>
            <p>We received a request to reset your password for your AI E-Learning Platform account.</p>
            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <p>To reset your password, click the button below:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This reset link will expire in 1 hour for your security.</p>
            <p><strong>The AI E-Learning Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 AI E-Learning Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getEnrollmentTemplate(user, course) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Enrollment Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .course-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Enrollment Confirmed!</h1>
          </div>
          <div class="content">
            <p>Congratulations ${user.name}!</p>
            <p>You have successfully enrolled in:</p>
            <div class="course-info">
              <h3>${course.title}</h3>
              <p><strong>Instructor:</strong> ${course.instructor?.name || 'TBA'}</p>
              <p><strong>Duration:</strong> ${course.formattedDuration || course.duration + ' minutes'}</p>
              <p><strong>Level:</strong> ${course.level}</p>
              <p><strong>Category:</strong> ${course.category}</p>
            </div>
            <p>You can now access all course materials and start your learning journey!</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/courses/${course._id}" class="button">Start Learning</a>
            <p>Remember to:</p>
            <ul>
              <li>📖 Follow the course structure for best results</li>
              <li>📝 Take notes during lectures</li>
              <li>💬 Participate in discussions</li>
              <li>📊 Track your progress regularly</li>
            </ul>
            <p>Happy Learning!</p>
            <p><strong>The AI E-Learning Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 AI E-Learning Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getCompletionTemplate(user, course, certificateUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Course Completed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .achievement { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; background: #ffc107; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Congratulations!</h1>
            <h2>Course Completed Successfully</h2>
          </div>
          <div class="content">
            <p>Amazing work, ${user.name}!</p>
            <div class="achievement">
              <h3>🏆 You've completed:</h3>
              <h2>${course.title}</h2>
              <p>Your dedication and hard work have paid off!</p>
            </div>
            <p>As a token of your achievement, your certificate is ready for download:</p>
            <a href="${certificateUrl}" class="button">Download Certificate</a>
            <p>What's next?</p>
            <ul>
              <li>🔍 Explore related courses to expand your knowledge</li>
              <li>📱 Share your achievement on social media</li>
              <li>💼 Add this certificate to your LinkedIn profile</li>
              <li>⭐ Rate and review the course to help others</li>
            </ul>
            <p>Keep up the excellent work and continue your learning journey!</p>
            <p><strong>The AI E-Learning Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 AI E-Learning Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getNewLectureTemplate(user, course, lecture) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Lecture Available</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .lecture-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 New Lecture Available!</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Great news! A new lecture has been added to your enrolled course:</p>
            <div class="lecture-info">
              <h3>${course.title}</h3>
              <h4>New Lecture: ${lecture.title}</h4>
              <p><strong>Duration:</strong> ${lecture.formattedDuration || Math.floor(lecture.duration / 60) + ' minutes'}</p>
              ${lecture.description ? `<p><strong>Description:</strong> ${lecture.description}</p>` : ''}
            </div>
            <p>Don't miss out on this new content – continue your learning journey!</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/courses/${course._id}/lectures/${lecture._id}" class="button">Watch Now</a>
            <p><strong>The AI E-Learning Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 AI E-Learning Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getCourseReminderTemplate(user, course, lastAccessDays) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Continue Your Learning</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .course-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📖 Continue Your Learning Journey</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>We noticed it's been ${lastAccessDays} days since you last accessed your course. Don't lose momentum!</p>
            <div class="course-info">
              <h3>${course.title}</h3>
              <p>Your progress is valuable – let's keep building on what you've learned!</p>
            </div>
            <p>Just a few minutes of learning each day can make a significant difference in your progress.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/courses/${course._id}" class="button">Continue Learning</a>
            <p>Remember:</p>
            <ul>
              <li>🎯 Consistency is key to success</li>
              <li>📈 Small daily progress leads to big achievements</li>
              <li>🧠 Regular learning helps retain information better</li>
            </ul>
            <p>We're here to support you every step of the way!</p>
            <p><strong>The AI E-Learning Team</strong></p>
          </div>
          <div class="footer">
            <p>© 2024 AI E-Learning Platform. All rights reserved.</p>
            <p><small>Don't want these reminders? <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/profile/preferences">Update your preferences</a></small></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();