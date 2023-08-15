const { proto, jidDecode } = require('@whiskeysockets/baileys')

const client = (sock) => {
	sock.parseMention = (text = '') => {
		return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
	}
	sock.decodeJid = (jid) => {
		if (!jid) return jid
		if (/:\d+@/gi.test(jid)) {
			let decode = jidDecode(jid) || {}
			return decode.user && decode.server && decode.user + '@' + decode.server || jid
		} else return jid
	}
	sock.getGroupAdmins = (jids) => {
		let admins = new Array()
		for (let x of jids) {
			if (x.admin == 'admin' || x.admin == 'superadmin') admins.push(x.id)
		}
		return admins
	}
	return sock
}

const sms = async(sock, m) => {
	if (m.key) {
		m.id = m.key.id
		m.isBaileys = (m.id.startsWith('3EB0') && m.id.length === 12) || (m.id.startsWith('BAE5') && m.id.length === 16)
		m.chat = m.key.remoteJid
		m.fromMe = m.key.fromMe
		m.isGroup = m.chat.endsWith('@g.us')
		m.sender = m.fromMe ? sock.decodeJid(sock.user.id) : m.isGroup ? m.key.participant : m.key.remoteJid
		m.isAdmin = m.isGroup ? sock.getGroupAdmins((await sock.groupMetadata(m.chat)).participants).includes(m.sender) : false
	}
	if (m.message) {
		m.type = Object.entries(m.message)[0][0]
		m.msg = (m.type == 'viewOnceMessageV2') ? m.message[m.type].message[Object.entries(m.message[m.type].message)[0][0]] : m.message[m.type]
		if (m.msg){
			if (m.type == 'viewOnceMessageV2') {
				m.msg.type = Object.entries(m.message[m.type].message)[0][0]
			}
			let quotedMention = m.msg.contextInfo != null ? m.msg.contextInfo.participant : ''
			let tagMention = m.msg.contextInfo != null ? m.msg.contextInfo.mentionedJid : []
			let mention = typeof(tagMention) == 'string' ? [tagMention] : tagMention
			mention != undefined ? mention.push(quotedMention) : []
			m.mentionUser = mention != undefined ? mention.filter(x => x) : []
			m.body = (m.type == 'conversation') ? m.msg : (m.type == 'extendedTextMessage') ? m.msg.text : (m.type == 'imageMessage') && m.msg.caption ? m.msg.caption : (m.type == 'videoMessage') && m.msg.caption ? m.msg.caption : (m.type == 'templateButtonReplyMessage') && m.msg.selectedId ? m.msg.selectedId : (m.type == 'buttonsResponseMessage') && m.msg.selectedButtonId ? m.msg.selectedButtonId : (m.type == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId ? m.msg.singleSelectReply.selectedRowId : ''
			m.quoted = m.msg.contextInfo != undefined ? m.msg.contextInfo.quotedMessage : null
			if (m.quoted) {
				m.quoted.type = Object.entries(m.quoted)[0][0]
				m.quoted.id = m.msg.contextInfo.stanzaId
				m.quoted.sender = m.msg.contextInfo.participant
				m.quoted.fromMe = m.quoted.sender.split('@')[0] == sock.user.id.split(':')[0]
				m.quoted.msg = (m.quoted.type == 'viewOnceMessageV2') ? m.quoted[m.quoted.type].message[Object.entries(m.quoted[m.quoted.type].message)[0][0]] : m.quoted[m.quoted.type]
				if (m.quoted.type == 'viewOnceMessageV2') {
					m.quoted.msg.type = Object.entries(m.quoted[m.quoted.type].message)[0][0]
				}
				m.quoted.mentionUser = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.mentionedJid : []
				m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
					key: {
						remoteJid: m.chat,
						fromMe: m.quoted.fromMe,
						id: m.quoted.id,
						participant: m.quoted.sender
					},
					message: m.quoted
				})
				m.quoted.delete = () => sock.sendMessage(m.chat, { delete: m.quoted.fakeObj.key })
			}
		}
	}
	m.reply = (teks = '', option = { id: m.chat, mentions: sock.parseMention(teks), quoted: m }) => sock.sendMessage(option.id ? option.id : m.chat, {
		text: teks,
		mentions: option.mentions ? option.mentions : sock.parseMention(teks)
	}, {
		quoted: option.quoted ? option.quoted : m
	})
	return m
}

module.exports = { client, sms }
