#!groovy

@Library('liveramp-base@v2')
import groovy.transform.Field

imageToDockerfileDir = ['api/reslang': '.']

pipeline {
	agent {
		label 'jenkins-agent-ubuntu-2004-n1-standard-8'
	}

	stages {
		stage('Checkout') {
			steps {
				checkout scm
			}
		}

		stage('Install') {
			when {
				not {
					branch 'master'
				}
			}
			steps {
				script {
					sh 'yarn install'
				}
			}
		}

		stage('Test') {
			when {
				not {
					branch 'master'
				}
			}
			steps {
				script {
					sh 'yarn test'
				}
			}
		}

		stage('Build and Push Docker Image') {
			when {
				branch 'master'
			}
			steps {
				script {
					tagAndPushDockerImage(imageToDockerfileDir, '', 'gar', true)
					tagAndPushDockerImage(imageToDockerfileDir, 'master', 'gar', true)
				}
			}
		}
	}

	options {
		timeout(time: 7, unit: 'MINUTES')
	}

	post {
		always {
			cleanWs()
		}
	}
}
