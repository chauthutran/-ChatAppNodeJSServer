// ClientApp.java

/**
 *This is the client side of my client server chat program
 **/
import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.net.*;
import java.io.*;
import javax.swing.border.*;
import java.util.*;
import javax.swing.event.*;

class ClientApp implements ActionListener,WindowListener, Runnable
{
	Socket s;
	BufferedReader br;
	BufferedWriter bw;
	JPanel rPanel = new JPanel();
	JLabel lblLogo;
	String status = "Connected";
	JFrame mainFrame = new JFrame("ODON Solutions Connections");
	Image icon  = Toolkit.getDefaultToolkit().getImage("icon.gif") ;
	JList usersList = new JList();
	JPanel panMainer = new JPanel();
	JPanel panMain = new JPanel();
	JPanel panSendMes = new JPanel();
	JLabel lblStatus;
	JTextField txtMessage = new JTextField();
	JButton butSend = new JButton("Send");
	Color c1 = new Color(255,60,33);
	Color c2 = new Color(192,192,192);
	Vector messageLog = new Vector();
	JScrollPane listPane = new JScrollPane(usersList);
	public String userName=null;
	ImageIcon image = new ImageIcon("Animation1.gif");
	ImageIcon image2 = new ImageIcon("trial.gif");
	
	//nought and crosses board
	
	JPanel NNCPanel = new JPanel();
	JPanel panBoard = new JPanel();
	JPanel panButtons = new JPanel();
	JLabel lbl1 = new JLabel("    Game Status:-->");
	JLabel lbl2 = new JLabel("Opponants Turn");
	JButton but11 = new JButton();
	JButton but12 = new JButton();
	JButton but13 = new JButton();
	JButton but21 = new JButton();
	JButton but22 = new JButton();
	JButton but23 = new JButton();
	JButton but31 = new JButton();
	JButton but32 = new JButton();
	JButton but33 = new JButton();
	JButton butStart = new JButton("Start");
	JButton butRestart = new JButton("Restart");
	int b11 = 1;
	int b12 = 1;
	int b13 = 1;
	int b21 = 1;
	int b22 = 1;
	int b23 = 1;
	int b31 = 1;
	int b32 = 1;
	int b33 = 1;
	int sb11 = 0;
	int sb12 = 0;
	int sb13 = 0;
	int sb21 = 0;
	int sb22 = 0;
	int sb23 = 0;
	int sb31 = 0;
	int sb32 = 0;
	int sb33 = 0;
	int myTurn=0;
	ImageIcon nought = new ImageIcon("Nought.gif"); 
	ImageIcon cross = new ImageIcon("Cross.gif"); 
	ImageIcon blank = new ImageIcon("Blank.gif");

	public ClientApp(String userName,String IPAddress)
	{
		
		lblLogo = new JLabel("",image,SwingConstants.CENTER);
		panMainer.setLayout(new GridLayout(1,2));
		this.userName = userName;
		lblStatus = new JLabel("USER: "+ userName +"       "+"STATUS: "+status);
		messageLog.clear();
		Border compound,raisedbevel,blackline;
        compound = BorderFactory.createEtchedBorder(EtchedBorder.RAISED);
		raisedbevel = BorderFactory.createRaisedBevelBorder();
		blackline = BorderFactory.createLineBorder(Color.black);
		butSend.setBackground(c1);
		butSend.setForeground(Color.white);
		butSend.addActionListener(this);
		lblLogo.setBorder(blackline);
		lblStatus.setBorder(compound);
		panMain.setBorder(raisedbevel);
		rPanel.add(NNCPanel);
		rPanel.add(lblLogo);
		rPanel.setLayout(new GridLayout(2,2));	
		usersList.setBorder(blackline);
		usersList.setBackground(c2);
		usersList.setForeground(Color.blue);
		txtMessage.setBorder(compound);
		txtMessage.addActionListener(this);
		lblStatus.setForeground(Color.white);
		panMain.setBackground(c1);
		mainFrame.setIconImage(icon);
		panMain.setLayout(new BorderLayout());
		lblStatus.setHorizontalTextPosition(JLabel.LEFT);
		panSendMes.setLayout(new BorderLayout());
		panSendMes.add(txtMessage,BorderLayout.CENTER);
		panSendMes.add(butSend,BorderLayout.EAST);
		panMain.add(lblStatus,BorderLayout.NORTH);
		panMain.add(listPane,BorderLayout.CENTER);
		panMain.add(panSendMes,BorderLayout.SOUTH);
		panMainer.add(panMain);
		panMainer.add(rPanel);
		mainFrame.setContentPane(panMainer);
		mainFrame.addWindowListener(this);
		//noughts and crosses bit
		
		NNCPanel.setLayout(new BorderLayout());
		panBoard.setLayout(new GridLayout(3,3));
		panButtons.setLayout(new GridLayout(2,2));
		but11.setBackground(Color.WHITE);
		but12.setBackground(Color.WHITE);
		but13.setBackground(Color.WHITE);
		but21.setBackground(Color.WHITE);
		but22.setBackground(Color.WHITE);
		but23.setBackground(Color.WHITE);
		but31.setBackground(Color.WHITE);
		but32.setBackground(Color.WHITE);
		but33.setBackground(Color.WHITE);
		but11.addActionListener(this);
		but12.addActionListener(this);
		but13.addActionListener(this);
		but21.addActionListener(this);
		but22.addActionListener(this);
		but23.addActionListener(this);
		but31.addActionListener(this);
		but32.addActionListener(this);
		but33.addActionListener(this);
		butStart.addActionListener(this);
		butRestart.addActionListener(this);
		panBoard.add(but11);
		panBoard.add(but12);
		panBoard.add(but13);
		panBoard.add(but21);
		panBoard.add(but22);
		panBoard.add(but23);
		panBoard.add(but31);
		panBoard.add(but32);
		panBoard.add(but33);
		panButtons.add(butStart);
		panButtons.add(butRestart);
		panButtons.add(lbl1);
		panButtons.add(lbl2);
		NNCPanel.add(panBoard,BorderLayout.CENTER);
		NNCPanel.add(panButtons,BorderLayout.SOUTH);
		mainFrame.pack();
		mainFrame.setSize(450,500);
		mainFrame.setVisible(true);
		txtMessage.requestFocus();
		
	
		
		try{
			
				s = new Socket(IPAddress,3000);
				br = new BufferedReader(new InputStreamReader(s.getInputStream()));
				bw = new BufferedWriter(new OutputStreamWriter(s.getOutputStream()));
				bw.flush();
				Thread th = new Thread(this);
				th.start();
			
					
			}catch(Exception er){}


	}
	
	
	public static void main(String args[])
	{
		ClientApp c1 = new ClientApp("ANON","192.168.0.20");
	}
	
	
	public void actionPerformed(ActionEvent ae)
	{
		if(ae.getSource().equals(butSend)||ae.getSource().equals(txtMessage))
		{
			if(!txtMessage.getText().equals(""))
			{
				
				messageLog.add(userName+": "+txtMessage.getText());
				usersList.setListData(messageLog);
				usersList.ensureIndexIsVisible((usersList.getLastVisibleIndex())+1);
				try{
					bw.write(userName+": "+txtMessage.getText());
					bw.newLine();
					bw.flush();
				}catch(Exception err){}
				txtMessage.setText("");
				txtMessage.requestFocus();
				lblLogo.setIcon(image2);
			}
		}
		
			if(ae.getSource()==but11&&b11==1&&myTurn==1)
		{
			but11.setIcon(cross);
			mainFrame.requestFocus();
			b11=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
					
					bw.write("b11");
					bw.newLine();
					bw.flush();
			}catch(Exception er){}
		}		
		else
		if(ae.getSource()==but12&&b12==1&&myTurn==1)
		{
			but12.setIcon(cross);
			mainFrame.requestFocus();
			b12=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
			
				bw.write("b12");
				bw.newLine();
				bw.flush();
			}catch(Exception er){}
		}
		else
		if(ae.getSource()==but13&&b13==1&&myTurn==1)
		{
			but13.setIcon(cross);
			mainFrame.requestFocus();
			b13=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
					bw.write("b13");
					bw.newLine();
					bw.flush();
			}catch(Exception er){}
		}
		else
		if(ae.getSource()==but21&&b21==1&&myTurn==1)
		{
			but21.setIcon(cross);
			mainFrame.requestFocus();
			b21=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
				bw.write("b21");
				bw.newLine();
				bw.flush();
			}catch(Exception er){}
		}
		else
		if(ae.getSource()==but22&&b22==1&&myTurn==1)
		{
			but22.setIcon(cross);
			mainFrame.requestFocus();
			b22=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
				bw.write("b22");
				bw.newLine();
				bw.flush();
			}catch(Exception er){}
		}
		else
		if(ae.getSource()==but23&&b23==1&&myTurn==1)
		{
			but23.setIcon(cross);
			mainFrame.requestFocus();
			b23=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
				bw.write("b23");
				bw.newLine();
				bw.flush();
			}catch(Exception er){}
		}
		else
		if(ae.getSource()==but31&&b31==1&&myTurn==1)
		{
			but31.setIcon(cross);
			mainFrame.requestFocus();
			b31=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
				bw.write("b31");
				bw.newLine();
				bw.flush();
			}catch(Exception er){}
		}
		else
		if(ae.getSource()==but32&&b32==1&&myTurn==1)
		{
			but32.setIcon(cross);
			mainFrame.requestFocus();
			b32=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
				bw.write("b32");
				bw.newLine();
				bw.flush();
			}catch(Exception er){}
		}
		else
		if(ae.getSource()==but33&&b33==1&&myTurn==1)
		{
			but33.setIcon(cross);
			mainFrame.requestFocus();
			b33=0;
			myTurn=0;
			lbl2.setText("Oponents turn...");
			try{
				bw.write("b33");
				bw.newLine();
				bw.flush();
			}catch(Exception er){}
		}
		if(ae.getSource()==butRestart)
		{
			restartGame();
			try{
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
			}catch(Exception er){}
		}
	}
	
	public void restartGame()
	{
			but11.setIcon(blank);
			but12.setIcon(blank);
			but13.setIcon(blank);
			but21.setIcon(blank);
			but22.setIcon(blank);
			but23.setIcon(blank);
			but31.setIcon(blank);
			but32.setIcon(blank);
			but33.setIcon(blank);
			myTurn=0;
			b11=1;
			b12=1;
			b13=1;
			b21=1;
			b22=1;
			b23=1;
			b31=1;
			b32=1;
			b33=1;
			sb11 = 0;
 			sb12 = 0;
			sb13 = 0;
			sb21 = 0;
			sb22 = 0;
			sb23 = 0;
			sb31 = 0;
			sb32 = 0;
			sb33 = 0;
			lbl2.setText("Opponants turn");
	
	}
	public void run()
	{
		while(true)
		{
			
			
			try{
				String strTemp = br.readLine();
				if(strTemp.equals("RESTART"))
				{
					restartGame();
					
				}
				else	
				if(strTemp.equals("b11")&& myTurn==0)
				{
					b11=0;
					sb11=1;
					but11.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					
					
				}
				else				
				if(strTemp.equals("b12")&& myTurn==0)
				{
					b12=0;
					sb12=1;
					but12.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					hasWon();
					
				}
				else
				if(strTemp.equals("b13")&& myTurn==0)
				{
					b13=0;
					sb13=1;
					but13.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					hasWon();
				}
				else
				if(strTemp.equals("b21")&& myTurn==0)
				{
					b21=0;
					sb21=1;
					but21.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					hasWon();
				}
				else
				if(strTemp.equals("b22")&& myTurn==0)
				{
					b22=0;
					sb22=1;
					but22.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					hasWon();
				}
				else
				if(strTemp.equals("b23")&& myTurn==0)
				{
					b23=0;
					sb23=1;
					but23.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					hasWon();
				}
				else
				if(strTemp.equals("b31")&& myTurn==0)
				{
					b31=0;
					sb31=1;
					but31.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					hasWon();
				}
				else
				if(strTemp.equals("b32")&& myTurn==0)
				{
					b32=0;
					sb32=1;
					but32.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					hasWon();
				}
				else
				if(strTemp.equals("b33")&& myTurn==0)
				{
					b33=0;
					sb33=1;
					but33.setIcon(nought);
					myTurn=1;
					lbl2.setText("Your Turn");
					hasWon();
				}
				else
				if(strTemp.equals("VICTORY"))
				{
					victory();
				}
				else
				{
							
					messageLog.add(strTemp);
					usersList.setListData(messageLog);
				}
				}catch(Exception er){}
		}
	}
	
	public void windowOpened(WindowEvent e)
	{}
	public void windowClosing(WindowEvent e)
	{
		try{
			s.close();
			}catch(Exception er){}
		System.exit(0);
	}
	public void windowClosed(WindowEvent e)
	{
		try{
			s.close();
			}catch(Exception er){}
		System.exit(0);
	}
	public void windowIconified(WindowEvent e)
	{}
	public void windowDeiconified(WindowEvent e)
	{
	
	}
	public void windowActivated(WindowEvent e)
	{}
	public void windowDeactivated(WindowEvent e)
	{
		
	} 
	public void victory()
	{
		JOptionPane.showMessageDialog(mainFrame, "You Win!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE); 
	}
	
	public void hasWon()
	{
		if(sb11==1&&sb12==1&&sb13==1)
		{
			int i = 0;
			int i2=0;
			while(i<10)
			{
				while(i2<1000)
				{
					but11.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but12.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but11.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but13.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but12.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but13.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but13.setIcon(nought);
					i2++;
				}
				i2=0;
				i++;
			}
			JOptionPane.showMessageDialog(mainFrame, "You Lost!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE); 
			restartGame();
			try{
				bw.write("VICTORY");
				bw.newLine();
				bw.flush();
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
				
				}catch(Exception er){}
		}
 		else
 			if(sb11==1&&sb22==1&&sb33==1)
			{
				
				int i = 0;
				int i2=0;
				while(i<10)
				{
					while(i2<1000)
					{
						but11.setIcon(blank);
						i2++;
					}
					i2=0;
					while(i2<100000)
					{
						but22.setIcon(blank);
						i2++;
					}
					i2=0;
					while(i2<100000)
					{
						but11.setIcon(nought);
						i2++;
					}
					i2=0;
					while(i2<100000)
					{
						but33.setIcon(blank);
						i2++;
					}
					i2=0;
					while(i2<100000)
					{
						but22.setIcon(nought);
						i2++;
					}
					i2=0;
					while(i2<100000)
					{
						but33.setIcon(blank);
						i2++;
					}
					i2=0;
					while(i2<100000)
					{
						but33.setIcon(nought);
						i2++;
					}
					i2=0;
					i++;
			}
			JOptionPane.showMessageDialog(mainFrame, "Come Sweet Death!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE);
			restartGame();
			try{
				bw.write("VICTORY");
				bw.newLine();
				bw.flush();
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
				
				}catch(Exception er){}
		}
 		else
		if(sb11==1&&sb21==1&&sb31==1)
		{
			
			int i = 0;
			int i2=0;
			while(i<10)
			{
				while(i2<1000)
				{
					but11.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but21.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but11.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but31.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but21.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but31.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but31.setIcon(nought);
					i2++;
				}
				i2=0;
				i++;
			}
			JOptionPane.showMessageDialog(mainFrame, "Loser!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE); 
			restartGame();
			try{
				bw.write("VICTORY");
				bw.newLine();
				bw.flush();
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
				
				}catch(Exception er){}
		}
	 	else
		if(sb12==1&&sb22==1&&sb32==1)
		{
			
			int i = 0;
			int i2=0;
			while(i<10)
			{
				while(i2<1000)
				{
					but12.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but22.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but12.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but32.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but22.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but32.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but32.setIcon(nought);
					i2++;
				}
				i2=0;
				i++;
			}
			JOptionPane.showMessageDialog(mainFrame, "Fatality!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE); 
			restartGame();
			try{
				bw.write("VICTORY");
				bw.newLine();
				bw.flush();
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
				
				}catch(Exception er){}
		}
	 	else
		if(sb13==1&&sb22==1&&sb31==1)
		{
			int i = 0;
			int i2=0;
			while(i<10)
			{
				while(i2<1000)
				{
					but13.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but22.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but13.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but31.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but22.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but31.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but31.setIcon(nought);
					i2++;
				}
				i2=0;
				i++;
			}
			JOptionPane.showMessageDialog(mainFrame, "AWWW.. what happened!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE); 
			restartGame();
			try{
				bw.write("VICTORY");
				bw.newLine();
				bw.flush();
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
				
				}catch(Exception er){}
		}
		else
		if(sb21==1&&sb22==1&&sb23==1)
		{
			int i = 0;
			int i2=0;
			while(i<10)
			{
				while(i2<1000)
				{
					but21.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but22.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but21.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but23.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but22.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but23.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but23.setIcon(nought);
					i2++;
				}
				i2=0;
				i++;
			}
			JOptionPane.showMessageDialog(mainFrame, "Whos your Daddy!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE);
			restartGame(); 
			try{
				bw.write("VICTORY");
				bw.newLine();
				bw.flush();
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
				
				}catch(Exception er){}
		}
		else
		if(sb31==1&&sb32==1&&sb33==1)
		{
			int i = 0;
			int i2=0;
			while(i<10)
			{
				while(i2<1000)
				{
					but31.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but32.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but31.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but33.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but32.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but33.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but33.setIcon(nought);
					i2++;
				}
				i2=0;
				i++;
			}
			JOptionPane.showMessageDialog(mainFrame, "You Suck at this!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE); 
			restartGame();
			try{
				bw.write("VICTORY");
				bw.newLine();
				bw.flush();
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
				
				}catch(Exception er){}
		}
 		else
		if(sb13==1&&sb23==1&&sb33==1)
		{
			int i = 0;
			int i2=0;
			while(i<10)
			{
				while(i2<1000)
				{
					but13.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but23.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but13.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but33.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but23.setIcon(nought);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but33.setIcon(blank);
					i2++;
				}
				i2=0;
				while(i2<100000)
				{
					but33.setIcon(nought);
					i2++;
				}
				i2=0;
				i++;
			}
			JOptionPane.showMessageDialog(mainFrame, "You have been Defeated!", "Noughts and Crosses", JOptionPane.INFORMATION_MESSAGE); 
			restartGame();
			try{
				bw.write("VICTORY");
				bw.newLine();
				bw.flush();
				bw.write("RESTART");
				bw.newLine();
				bw.flush();
				}catch(Exception er){}
		}
	
	}
	

}